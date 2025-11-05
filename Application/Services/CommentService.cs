using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Application.Services
{
    public class CommentService
    {
        private readonly ICommentRepository _commentRepository;
        private readonly IUserRepository _userRepository;
        private readonly AppDbContext _context;
        private readonly INotificationService _notificationService;

        public CommentService(
            ICommentRepository commentRepository,
            IUserRepository userRepository,
            AppDbContext context,
            INotificationService notificationService)
        {
            _commentRepository = commentRepository;
            _userRepository = userRepository;
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<CommentDto?> CreateCommentAsync(CreateCommentRequest request, int userId)
        {
            // Validate user exists in database
            var userEntity = await _userRepository.GetByIdAsync(userId);
            if (userEntity == null)
            {
                Console.WriteLine($"[CommentService] User with ID {userId} not found in database");
                throw new InvalidOperationException($"User with ID {userId} does not exist");
            }
            
            // Extract mentions (@username) and hashtags (#tag) from content
            var mentions = ExtractMentions(request.Content);
            var hashtags = ExtractHashtags(request.Content);
            
            // Validate mentioned users exist
            var mentionedUserIds = new List<int>();
            foreach (var username in mentions)
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.username.Value == username);
                if (user != null)
                {
                    mentionedUserIds.Add(user.user_id);
                }
            }
            
            var comment = new Comment
            {
                Content = request.Content,
                PostId = request.PostId,
                UserId = userId,
                ParentCommentId = request.ParentCommentId,
                MentionedUserIds = mentionedUserIds.Count > 0 ? string.Join(",", mentionedUserIds) : null,
                Hashtags = hashtags.Count > 0 ? string.Join(",", hashtags) : null,
                CreatedAt = DateTime.UtcNow
            };
            
            var createdComment = await _commentRepository.AddAsync(comment);
            
            // Lưu mentions vào CommentMention table
            foreach (var mentionedUserId in mentionedUserIds)
            {
                var commentMention = new CommentMention
                {
                    CommentId = createdComment.Id,
                    MentionedUserId = mentionedUserId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.CommentMentions.Add(commentMention);
                
                // Gửi notification cho user được mention
                var mentionedUser = await _userRepository.GetByIdAsync(mentionedUserId);
                if (mentionedUser != null)
                {
                    await _notificationService.SendMentionNotificationAsync(
                        mentionedUserId,
                        userEntity.username.Value,
                        request.PostId,
                        createdComment.Id
                    );
                }
            }
            await _context.SaveChangesAsync();
            
            return await MapToDto(createdComment, userId, userEntity?.username?.Value ?? "unknown");
        }

        public async Task<List<CommentDto>> GetCommentsByPostIdAsync(int postId, int currentUserId, int pageNumber = 1, int pageSize = 20)
        {
            var comments = await _commentRepository.GetByPostIdAsync(postId, pageNumber, pageSize);
            var dtos = new List<CommentDto>();
            
            foreach (var comment in comments)
            {
                var dto = await MapToDto(comment, currentUserId, comment.User?.username?.Value ?? "unknown");
                
                // Load replies (first 3)
                var replies = await _commentRepository.GetRepliesAsync(comment.Id);
                dto.Replies = new List<CommentDto>();
                foreach (var reply in replies.Take(3))
                {
                    dto.Replies.Add(await MapToDto(reply, currentUserId, reply.User?.username?.Value ?? "unknown"));
                }
                
                dtos.Add(dto);
            }
            
            return dtos;
        }

        public async Task<List<CommentDto>> GetRepliesAsync(int parentCommentId, int currentUserId)
        {
            var replies = await _commentRepository.GetRepliesAsync(parentCommentId);
            var dtos = new List<CommentDto>();
            
            foreach (var reply in replies)
            {
                dtos.Add(await MapToDto(reply, currentUserId, reply.User?.username?.Value ?? "unknown"));
            }
            
            return dtos;
        }

        public async Task<CommentDto?> UpdateCommentAsync(int commentId, UpdateCommentRequest request, int userId)
        {
            var comment = await _commentRepository.GetByIdAsync(commentId);
            if (comment == null || comment.UserId != userId) return null;
            
            // Lưu content cũ để ghi vào CommentEditHistory
            var oldContent = comment.Content;
            
            // Extract new mentions and hashtags
            var mentions = ExtractMentions(request.Content);
            var hashtags = ExtractHashtags(request.Content);
            
            var mentionedUserIds = new List<int>();
            foreach (var username in mentions)
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.username.Value == username);
                if (user != null)
                {
                    mentionedUserIds.Add(user.user_id);
                }
            }
            
            // Update comment
            comment.Content = request.Content;
            comment.MentionedUserIds = mentionedUserIds.Count > 0 ? string.Join(",", mentionedUserIds) : null;
            comment.Hashtags = hashtags.Count > 0 ? string.Join(",", hashtags) : null;
            comment.UpdatedAt = DateTime.UtcNow;
            
            await _commentRepository.UpdateAsync(comment);
            
            // Lưu edit history
            var editHistory = new CommentEditHistory
            {
                CommentId = commentId,
                OldContent = oldContent,
                NewContent = request.Content,
                EditedAt = DateTime.UtcNow
            };
            _context.CommentEditHistories.Add(editHistory);
            
            // Xóa mentions cũ và tạo mentions mới
            var oldMentions = await _context.CommentMentions
                .Where(cm => cm.CommentId == commentId)
                .ToListAsync();
            _context.CommentMentions.RemoveRange(oldMentions);
            
            foreach (var mentionedUserId in mentionedUserIds)
            {
                var commentMention = new CommentMention
                {
                    CommentId = commentId,
                    MentionedUserId = mentionedUserId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.CommentMentions.Add(commentMention);
            }
            
            await _context.SaveChangesAsync();
            
            return await MapToDto(comment, userId, comment.User?.username?.Value ?? "unknown");
        }

        public async Task<bool> DeleteCommentAsync(int commentId, int userId)
        {
            var comment = await _commentRepository.GetByIdAsync(commentId);
            if (comment == null || comment.UserId != userId) return false;
            
            var postId = comment.PostId;
            var isParentComment = comment.ParentCommentId == null;
            
            // Đếm tổng số comments sẽ bị xóa (comment + replies nếu là parent)
            int totalDeletedCount = 1; // Comment chính
            
            if (isParentComment)
            {
                // Nếu là parent comment, xóa cascade tất cả replies
                var replies = await _context.Comments
                    .Where(c => c.ParentCommentId == commentId && !c.IsDeleted)
                    .ToListAsync();
                
                totalDeletedCount += replies.Count;
                
                // Đánh dấu tất cả replies là deleted
                foreach (var reply in replies)
                {
                    reply.IsDeleted = true;
                }
            }
            
            // Xóa comment chính
            var success = await _commentRepository.DeleteAsync(commentId);
            
            if (success)
            {
                // Cập nhật CommentsCount của Post
                var post = await _context.Posts.FindAsync(postId);
                if (post != null)
                {
                    post.CommentsCount = Math.Max(0, post.CommentsCount - totalDeletedCount);
                    await _context.SaveChangesAsync();
                }
                
                Console.WriteLine($"[CommentService] Deleted comment {commentId} and {totalDeletedCount - 1} replies. Updated post {postId} CommentsCount to {post?.CommentsCount}");
            }
            
            return success;
        }

        public async Task<bool> LikeCommentAsync(int commentId, int userId)
        {
            return await _commentRepository.LikeCommentAsync(commentId, userId);
        }

        public async Task<bool> UnlikeCommentAsync(int commentId, int userId)
        {
            return await _commentRepository.UnlikeCommentAsync(commentId, userId);
        }

        // Helper: Extract @mentions from content
        private List<string> ExtractMentions(string content)
        {
            var regex = new Regex(@"@(\w+)", RegexOptions.IgnoreCase);
            var matches = regex.Matches(content);
            return matches.Select(m => m.Groups[1].Value).Distinct().ToList();
        }

        // Helper: Extract #hashtags from content
        private List<string> ExtractHashtags(string content)
        {
            var regex = new Regex(@"#(\w+)", RegexOptions.IgnoreCase);
            var matches = regex.Matches(content);
            return matches.Select(m => m.Groups[1].Value.ToLower()).Distinct().ToList();
        }

        // Helper: Map Comment entity to DTO
        private async Task<CommentDto> MapToDto(Comment comment, int currentUserId, string username)
        {
            var mentionedUserIds = new List<int>();
            var mentionedUsernames = new List<string>();
            
            if (!string.IsNullOrEmpty(comment.MentionedUserIds))
            {
                mentionedUserIds = comment.MentionedUserIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(int.Parse).ToList();
                
                // Get usernames for mentioned user IDs
                foreach (var uid in mentionedUserIds)
                {
                    var user = await _userRepository.GetByIdAsync(uid);
                    if (user != null)
                    {
                        mentionedUsernames.Add(user.username.Value);
                    }
                }
            }
            
            var hashtags = new List<string>();
            if (!string.IsNullOrEmpty(comment.Hashtags))
            {
                hashtags = comment.Hashtags.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList();
            }
            
            var isLiked = await _commentRepository.IsCommentLikedByUserAsync(comment.Id, currentUserId);
            
            // Get avatar URL from user
            string? avatarUrl = null;
            if (comment.User != null)
            {
                avatarUrl = comment.User.avatar_url?.Value;
            }
            
            return new CommentDto
            {
                Id = comment.Id,
                Content = comment.Content,
                PostId = comment.PostId,
                UserId = comment.UserId,
                Username = username,
                AvatarUrl = avatarUrl,
                ParentCommentId = comment.ParentCommentId,
                MentionedUserIds = mentionedUserIds,
                MentionedUsernames = mentionedUsernames,
                Hashtags = hashtags,
                LikesCount = comment.LikesCount,
                RepliesCount = comment.RepliesCount,
                IsLikedByCurrentUser = isLiked,
                IsEdited = comment.UpdatedAt.HasValue, // Edited if UpdatedAt is not null
                CreatedAt = comment.CreatedAt,
                UpdatedAt = comment.UpdatedAt
            };
        }
    }
}
