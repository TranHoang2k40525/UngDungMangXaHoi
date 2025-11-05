using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    public class ShareService
    {
        private readonly IShareRepository _shareRepository;
        private readonly IPostRepository _postRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationRepository _notificationRepository;
        private readonly IRealTimeNotificationService _realTimeNotificationService;

        public ShareService(
            IShareRepository shareRepository,
            IPostRepository postRepository,
            IUserRepository userRepository,
            INotificationRepository notificationRepository,
            IRealTimeNotificationService realTimeNotificationService)
        {
            _shareRepository = shareRepository;
            _postRepository = postRepository;
            _userRepository = userRepository;
            _notificationRepository = notificationRepository;
            _realTimeNotificationService = realTimeNotificationService;
        }

        public async Task<ShareDto> CreateShareAsync(int userId, CreateShareDto dto)
        {
            // Kiểm tra post tồn tại
            var post = await _postRepository.GetByIdAsync(dto.PostId);
            if (post == null)
            {
                throw new Exception("Bài đăng không tồn tại");
            }

            // Tạo share
            var share = new Share
            {
                post_id = dto.PostId,
                user_id = userId,
                caption = dto.Caption,
                privacy = dto.Privacy,
                created_at = DateTimeOffset.UtcNow
            };

            share = await _shareRepository.AddAsync(share);

            // Gửi thông báo cho chủ bài đăng (nếu không phải chính họ)
            if (post.user_id != userId)
            {
                await CreateAndSendShareNotification(post, userId);
            }

            // Gửi real-time update về số lượng share
            await SendShareUpdateToPostOwner(post, userId);

            return MapToDto(share);
        }

        public async Task<List<ShareDto>> GetSharesByPostAsync(int postId)
        {
            var shares = await _shareRepository.GetByPostIdAsync(postId);
            return shares.Select(MapToDto).ToList();
        }

        public async Task<List<ShareDto>> GetSharesByUserAsync(int userId)
        {
            var shares = await _shareRepository.GetByUserIdAsync(userId);
            return shares.Select(MapToDto).ToList();
        }

        public async Task<int> GetShareCountAsync(int postId)
        {
            return await _shareRepository.GetShareCountByPostIdAsync(postId);
        }

        public async Task DeleteShareAsync(int shareId, int userId)
        {
            var share = await _shareRepository.GetByIdAsync(shareId);
            
            if (share == null)
            {
                throw new Exception("Chia sẻ không tồn tại");
            }

            // Chỉ cho phép người tạo share xóa
            if (share.user_id != userId)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xóa chia sẻ này");
            }

            await _shareRepository.DeleteAsync(share);

            // Cập nhật real-time
            var post = await _postRepository.GetByIdAsync(share.post_id);
            if (post != null)
            {
                await SendShareUpdateToPostOwner(post, userId);
            }
        }

        private async Task CreateAndSendShareNotification(Post post, int sharerUserId)
        {
            var sharer = await _userRepository.GetByIdAsync(sharerUserId);
            if (sharer == null) return;

            var notification = new Notification
            {
                user_id = post.user_id,
                sender_id = sharerUserId,
                type = NotificationType.Share,
                post_id = post.post_id,
                content = $"{sharer.username.Value} đã chia sẻ bài viết của bạn",
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
                SenderUsername = sharer.username.Value,
                SenderAvatar = sharer.avatar_url?.Value,
                Type = notification.type,
                PostId = notification.post_id,
                Content = notification.content,
                IsRead = notification.is_read,
                CreatedAt = notification.created_at
            };

            await _realTimeNotificationService.SendNotificationToUserAsync(post.user_id, notificationDto);
        }

        private async Task SendShareUpdateToPostOwner(Post post, int sharerUserId)
        {
            var shareCount = await GetShareCountAsync(post.post_id);
            
            var updateData = new
            {
                PostId = post.post_id,
                SharerUserId = sharerUserId,
                ShareCount = shareCount
            };

            await _realTimeNotificationService.SendShareUpdateAsync(post.user_id, updateData);
        }

        private ShareDto MapToDto(Share share)
        {
            return new ShareDto
            {
                ShareId = share.share_id,
                PostId = share.post_id,
                UserId = share.user_id,
                Username = share.User?.username?.Value ?? "",
                AvatarUrl = share.User?.avatar_url?.Value,
                Caption = share.caption,
                Privacy = share.privacy,
                CreatedAt = share.created_at
            };
        }
    }
}
