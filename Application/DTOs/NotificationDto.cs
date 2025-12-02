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
        public int? CommentId { get; set; } // ID của comment (cho mention, reply)
        public int? ReactionType { get; set; } // Loại reaction (1-6) cho notification reaction
        public int? ConversationId { get; set; } // ID của nhóm chat (cho GroupMessage)
        public int? MessageId { get; set; } // ID của tin nhắn (cho Message, GroupMessage)
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
