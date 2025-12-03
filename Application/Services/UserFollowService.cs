using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    /// <summary>
    /// Service xử lý logic follow/unfollow với thông báo
    /// </summary>
    public class UserFollowService
    {
        private readonly IUserRepository _userRepository;
        private readonly INotificationRepository _notificationRepository;
        private readonly IRealTimeNotificationService _realTimeNotificationService;

        public UserFollowService(
            IUserRepository userRepository,
            INotificationRepository notificationRepository,
            IRealTimeNotificationService realTimeNotificationService)
        {
            _userRepository = userRepository;
            _notificationRepository = notificationRepository;
            _realTimeNotificationService = realTimeNotificationService;
        }

        /// <summary>
        /// Follow một user và gửi thông báo
        /// </summary>
        public async Task FollowUserAsync(int followerId, int followingId)
        {
            // Kiểm tra không thể follow chính mình
            if (followerId == followingId)
            {
                throw new InvalidOperationException("Không thể theo dõi chính mình");
            }

            // Kiểm tra user tồn tại
            var follower = await _userRepository.GetByIdAsync(followerId);
            var following = await _userRepository.GetByIdAsync(followingId);

            if (follower == null || following == null)
            {
                throw new InvalidOperationException("Không tìm thấy user");
            }

            // Thực hiện follow
            await _userRepository.FollowUserAsync(followerId, followingId);

            // Tạo và gửi thông báo
            try
            {
                var notification = new Notification
                {
                    user_id = followingId,
                    sender_id = followerId,
                    type = NotificationType.Follow,
                    post_id = null,
                    content = $"{follower.username.Value} đã bắt đầu theo dõi bạn",
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
                    SenderUsername = follower.username.Value,
                    SenderAvatar = follower.avatar_url?.Value,
                    Type = notification.type,
                    PostId = null,
                    Content = notification.content,
                    IsRead = notification.is_read,
                    CreatedAt = notification.created_at
                };

                await _realTimeNotificationService.SendNotificationToUserAsync(followingId, notificationDto);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UserFollowService] Error sending follow notification: {ex.Message}");
                // Không throw exception để không ảnh hưởng đến việc follow
            }
        }

        /// <summary>
        /// Unfollow một user
        /// </summary>
        public async Task UnfollowUserAsync(int followerId, int followingId)
        {
            await _userRepository.UnfollowUserAsync(followerId, followingId);
        }

        /// <summary>
        /// Kiểm tra xem đã follow chưa
        /// </summary>
        public async Task<bool> IsFollowingAsync(int followerId, int followingId)
        {
            return await _userRepository.IsFollowingAsync(followerId, followingId);
        }
    }
}
