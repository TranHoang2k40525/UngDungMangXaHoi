using System;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class NotificationDto
    {
        public int NotificationId { get; set; }
        public int UserId { get; set; }
        public int? SenderId { get; set; }
        public string? SenderUsername { get; set; }
        public string? SenderAvatar { get; set; }
        public NotificationType Type { get; set; }
        public int? PostId { get; set; }
        public string Content { get; set; } = null!;
        public bool IsRead { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }

    public class NotificationSummaryDto
    {
        public int UnreadCount { get; set; }
        public List<NotificationDto> RecentNotifications { get; set; } = new();
    }
}
