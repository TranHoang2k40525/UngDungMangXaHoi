using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    public class ReactionService
    {
        private readonly IReactionRepository _reactionRepository;
        private readonly IPostRepository _postRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationRepository _notificationRepository;
        private readonly IRealTimeNotificationService _realTimeNotificationService;

        public ReactionService(
            IReactionRepository reactionRepository,
            IPostRepository postRepository,
            IUserRepository userRepository,
            INotificationRepository notificationRepository,
            IRealTimeNotificationService realTimeNotificationService)
        {
            _reactionRepository = reactionRepository;
            _postRepository = postRepository;
            _userRepository = userRepository;
            _notificationRepository = notificationRepository;
            _realTimeNotificationService = realTimeNotificationService;
        }

        public async Task<ReactionDto> AddOrUpdateReactionAsync(int accountId, CreateReactionDto dto)
        {
            // Get user from accountId (convert accountId -> userId)
            var user = await _userRepository.GetByAccountIdAsync(accountId);
            if (user == null)
            {
                throw new Exception("Người dùng không tồn tại");
            }
            int userId = user.user_id;

            // Kiểm tra post tồn tại
            var post = await _postRepository.GetByIdAsync(dto.PostId);
            if (post == null)
            {
                throw new Exception("Bài đăng không tồn tại");
            }

            // Kiểm tra xem user đã react chưa
            var existingReaction = await _reactionRepository.GetByPostAndUserAsync(dto.PostId, userId);

            Reaction reaction;
            bool isNew = false;

            if (existingReaction != null)
            {
                // Nếu reaction type giống nhau -> xóa reaction (unlike)
                if (existingReaction.reaction_type == dto.ReactionType)
                {
                    await _reactionRepository.DeleteAsync(existingReaction);
                    
                    // Gửi real-time update về việc xóa reaction
                    await SendReactionUpdateToPostOwner(post, userId);
                    
                    return null!; // Trả về null để báo hiệu đã xóa
                }
                
                // Nếu khác -> update reaction type
                existingReaction.reaction_type = dto.ReactionType;
                existingReaction.created_at = DateTimeOffset.UtcNow;
                reaction = await _reactionRepository.UpdateAsync(existingReaction);
            }
            else
            {
                // Tạo reaction mới
                reaction = new Reaction
                {
                    post_id = dto.PostId,
                    user_id = userId,
                    reaction_type = dto.ReactionType,
                    created_at = DateTimeOffset.UtcNow
                };
                reaction = await _reactionRepository.AddAsync(reaction);
                isNew = true;
            }

            // Gửi thông báo cho chủ bài đăng (nếu không phải chính họ)
            if (post.user_id != userId && isNew)
            {
                await CreateAndSendReactionNotification(post, userId, dto.ReactionType);
            }

            // Gửi real-time update
            await SendReactionUpdateToPostOwner(post, userId);

            return MapToDto(reaction);
        }

        public async Task<ReactionSummaryDto> GetReactionSummaryAsync(int postId, int? currentAccountId = null)
        {
            var reactionCounts = await _reactionRepository.GetReactionCountsByPostIdAsync(postId);
            
            ReactionType? userReaction = null;
            if (currentAccountId.HasValue)
            {
                // Convert accountId to userId
                var user = await _userRepository.GetByAccountIdAsync(currentAccountId.Value);
                if (user != null)
                {
                    var existing = await _reactionRepository.GetByPostAndUserAsync(postId, user.user_id);
                    userReaction = existing?.reaction_type;
                }
            }

            return new ReactionSummaryDto
            {
                TotalReactions = reactionCounts.Values.Sum(),
                ReactionCounts = reactionCounts.Select(kvp => new ReactionCountDto
                {
                    ReactionType = kvp.Key,
                    Count = kvp.Value
                }).ToList(),
                UserReaction = userReaction
            };
        }

        public async Task<List<ReactionDto>> GetReactionsByPostAsync(int postId)
        {
            var reactions = await _reactionRepository.GetByPostIdAsync(postId);
            return reactions.Select(MapToDto).ToList();
        }

        private async Task CreateAndSendReactionNotification(Post post, int reactorUserId, ReactionType reactionType)
        {
            var reactor = await _userRepository.GetByIdAsync(reactorUserId);
            if (reactor == null) return;

            var reactionText = reactionType switch
            {
                ReactionType.Like => "thích",
                ReactionType.Love => "yêu thích",
                ReactionType.Haha => "thả haha",
                ReactionType.Wow => "thả wow",
                ReactionType.Sad => "thả buồn",
                ReactionType.Angry => "thả phẫn nộ",
                _ => "bày tỏ cảm xúc"
            };

            var notification = new Notification
            {
                user_id = post.user_id,
                sender_id = reactorUserId,
                type = NotificationType.Reaction,
                post_id = post.post_id,
                reaction_type = (int)reactionType,
                content = $"{reactor.username.Value} đã {reactionText} bài viết của bạn",
                is_read = false,
                created_at = DateTimeOffset.UtcNow
            };

            await _notificationRepository.AddAsync(notification);

            // Gửi real-time notification
            var notificationDto = new NotificationDto
            {
                NotificationId = notification.notification_id,
                UserId = notification.user_id,
                SenderId = notification.sender_id,
                SenderUsername = reactor.username.Value,
                SenderAvatar = reactor.avatar_url?.Value,
                Type = notification.type,
                PostId = notification.post_id,
                ReactionType = notification.reaction_type,
                Content = notification.content,
                IsRead = notification.is_read,
                CreatedAt = notification.created_at
            };

            await _realTimeNotificationService.SendNotificationToUserAsync(post.user_id, notificationDto);
        }

        private async Task SendReactionUpdateToPostOwner(Post post, int reactorUserId)
        {
            var summary = await GetReactionSummaryAsync(post.post_id);
            
            var updateData = new
            {
                PostId = post.post_id,
                ReactorUserId = reactorUserId,
                Summary = summary
            };

            await _realTimeNotificationService.SendReactionUpdateAsync(post.user_id, updateData);
        }

        private ReactionDto MapToDto(Reaction reaction)
        {
            return new ReactionDto
            {
                ReactionId = reaction.reaction_id,
                PostId = reaction.post_id,
                UserId = reaction.user_id,
                Username = reaction.User?.username?.Value ?? "",
                AvatarUrl = reaction.User?.avatar_url?.Value,
                ReactionType = reaction.reaction_type,
                CreatedAt = reaction.created_at
            };
        }
    }
}
