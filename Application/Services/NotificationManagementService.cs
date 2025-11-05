using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    public class NotificationManagementService
    {
        private readonly INotificationRepository _notificationRepository;
        private readonly IUserRepository _userRepository;

        public NotificationManagementService(
            INotificationRepository notificationRepository,
            IUserRepository userRepository)
        {
            _notificationRepository = notificationRepository;
            _userRepository = userRepository;
        }

        public async Task<List<NotificationDto>> GetNotificationsAsync(int userId, int skip = 0, int take = 20)
        {
            var notifications = await _notificationRepository.GetByUserIdAsync(userId, skip, take);
            return notifications.Select(MapToDto).ToList();
        }

        public async Task<NotificationSummaryDto> GetNotificationSummaryAsync(int userId)
        {
            var unreadCount = await _notificationRepository.GetUnreadCountByUserIdAsync(userId);
            var recentNotifications = await _notificationRepository.GetByUserIdAsync(userId, 0, 10);

            return new NotificationSummaryDto
            {
                UnreadCount = unreadCount,
                RecentNotifications = recentNotifications.Select(MapToDto).ToList()
            };
        }

        public async Task<List<NotificationDto>> GetUnreadNotificationsAsync(int userId)
        {
            var notifications = await _notificationRepository.GetUnreadByUserIdAsync(userId);
            return notifications.Select(MapToDto).ToList();
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            return await _notificationRepository.GetUnreadCountByUserIdAsync(userId);
        }

        public async Task MarkAsReadAsync(int notificationId, int userId)
        {
            var notification = await _notificationRepository.GetByIdAsync(notificationId);
            
            if (notification == null)
            {
                throw new Exception("Thông báo không tồn tại");
            }

            if (notification.user_id != userId)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền đánh dấu thông báo này");
            }

            await _notificationRepository.MarkAsReadAsync(notificationId);
        }

        public async Task MarkAllAsReadAsync(int userId)
        {
            await _notificationRepository.MarkAllAsReadAsync(userId);
        }

        public async Task DeleteNotificationAsync(int notificationId, int userId)
        {
            var notification = await _notificationRepository.GetByIdAsync(notificationId);
            
            if (notification == null)
            {
                throw new Exception("Thông báo không tồn tại");
            }

            if (notification.user_id != userId)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xóa thông báo này");
            }

            await _notificationRepository.DeleteAsync(notification);
        }

        private NotificationDto MapToDto(Notification notification)
        {
            return new NotificationDto
            {
                NotificationId = notification.notification_id,
                UserId = notification.user_id,
                SenderId = notification.sender_id,
                SenderUsername = notification.Sender?.username?.Value,
                SenderAvatar = notification.Sender?.avatar_url?.Value,
                Type = notification.type,
                PostId = notification.post_id,
                Content = notification.content,
                IsRead = notification.is_read,
                CreatedAt = notification.created_at
            };
        }
    }
}
