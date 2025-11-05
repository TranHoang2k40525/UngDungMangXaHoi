using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class CommentRepository : ICommentRepository
    {
        private readonly AppDbContext _context;

        public CommentRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Comment> AddAsync(Comment comment)
        {
            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();
            
            // Update Post.CommentsCount
            var post = await _context.Posts.FindAsync(comment.PostId);
            if (post != null)
            {
                post.CommentsCount++;
                await _context.SaveChangesAsync();
            }
            
            // Update ParentComment.RepliesCount if this is a reply
            if (comment.ParentCommentId.HasValue)
            {
                var parentComment = await _context.Comments.FindAsync(comment.ParentCommentId.Value);
                if (parentComment != null)
                {
                    parentComment.RepliesCount++;
                    await _context.SaveChangesAsync();
                }
            }
            
            // ✅ RELOAD comment với User entity để có đầy đủ thông tin
            var reloadedComment = await _context.Comments
                .Include(c => c.User)
                .Include(c => c.CommentLikes)
                .FirstOrDefaultAsync(c => c.Id == comment.Id);
            
            return reloadedComment ?? comment;
        }

        public async Task<Comment?> GetByIdAsync(int id)
        {
            return await _context.Comments
                .Include(c => c.User)
                .Include(c => c.CommentLikes)
                .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
        }

        public async Task<List<Comment>> GetByPostIdAsync(int postId, int pageNumber = 1, int pageSize = 20)
        {
            return await _context.Comments
                .Where(c => c.PostId == postId && c.ParentCommentId == null && !c.IsDeleted)
                .Include(c => c.User)
                .Include(c => c.CommentLikes)
                .OrderByDescending(c => c.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<List<Comment>> GetRepliesAsync(int parentCommentId)
        {
            return await _context.Comments
                .Where(c => c.ParentCommentId == parentCommentId && !c.IsDeleted)
                .Include(c => c.User)
                .Include(c => c.CommentLikes)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> UpdateAsync(Comment comment)
        {
            comment.UpdatedAt = DateTime.UtcNow;
            _context.Comments.Update(comment);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var comment = await _context.Comments.FindAsync(id);
            if (comment == null) return false;
            
            comment.IsDeleted = true;
            comment.UpdatedAt = DateTime.UtcNow;
            
            // Decrement Post.CommentsCount
            var post = await _context.Posts.FindAsync(comment.PostId);
            if (post != null && post.CommentsCount > 0)
            {
                post.CommentsCount--;
            }
            
            // Decrement ParentComment.RepliesCount if this is a reply
            if (comment.ParentCommentId.HasValue)
            {
                var parentComment = await _context.Comments.FindAsync(comment.ParentCommentId.Value);
                if (parentComment != null && parentComment.RepliesCount > 0)
                {
                    parentComment.RepliesCount--;
                }
            }
            
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<int> GetCommentsCountByPostIdAsync(int postId)
        {
            return await _context.Comments
                .CountAsync(c => c.PostId == postId && !c.IsDeleted);
        }

        public async Task<bool> LikeCommentAsync(int commentId, int userId)
        {
            var existingLike = await _context.CommentLikes
                .FirstOrDefaultAsync(cl => cl.CommentId == commentId && cl.UserId == userId);
            
            if (existingLike != null) return false; // Already liked
            
            var like = new CommentLike
            {
                CommentId = commentId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            
            _context.CommentLikes.Add(like);
            
            // Increment LikesCount
            var comment = await _context.Comments.FindAsync(commentId);
            if (comment != null)
            {
                comment.LikesCount++;
            }
            
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> UnlikeCommentAsync(int commentId, int userId)
        {
            var like = await _context.CommentLikes
                .FirstOrDefaultAsync(cl => cl.CommentId == commentId && cl.UserId == userId);
            
            if (like == null) return false;
            
            _context.CommentLikes.Remove(like);
            
            // Decrement LikesCount
            var comment = await _context.Comments.FindAsync(commentId);
            if (comment != null && comment.LikesCount > 0)
            {
                comment.LikesCount--;
            }
            
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> IsCommentLikedByUserAsync(int commentId, int userId)
        {
            return await _context.CommentLikes
                .AnyAsync(cl => cl.CommentId == commentId && cl.UserId == userId);
        }

        public async Task<int> GetLikesCountAsync(int commentId)
        {
            return await _context.CommentLikes
                .CountAsync(cl => cl.CommentId == commentId);
        }

        public async Task<List<Comment>> GetCommentsByUserMentionAsync(int userId)
        {
            var userIdStr = userId.ToString();
            return await _context.Comments
                .Where(c => !c.IsDeleted && c.MentionedUserIds != null && 
                           (c.MentionedUserIds.Contains($",{userIdStr},") || 
                            c.MentionedUserIds.StartsWith($"{userIdStr},") || 
                            c.MentionedUserIds.EndsWith($",{userIdStr}") ||
                            c.MentionedUserIds == userIdStr))
                .Include(c => c.User)
                .Include(c => c.Post)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<Comment>> GetCommentsByHashtagAsync(string hashtag)
        {
            var normalizedHashtag = hashtag.ToLower().Replace("#", "");
            return await _context.Comments
                .Where(c => !c.IsDeleted && c.Hashtags != null && 
                           c.Hashtags.ToLower().Contains(normalizedHashtag))
                .Include(c => c.User)
                .Include(c => c.Post)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }
    }
}
