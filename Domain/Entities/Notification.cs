using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    /// <summary>
    /// Entity cho thông báo
    /// </summary>
    public class Notification
    {
        public int notification_id { get; set; }
        public int user_id { get; set; }  // Người nhận thông báo
        public int? sender_id { get; set; }  // Người gửi hành động
        public NotificationType type { get; set; }
        public int? post_id { get; set; }  // Bài đăng liên quan
        public string content { get; set; } = null!;
        public bool is_read { get; set; } = false;
        public DateTimeOffset created_at { get; set; }

        // Navigation properties
        public User User { get; set; } = null!;
        public User? Sender { get; set; }
        public Post? Post { get; set; }
    }

    /// <summary>
    /// Các loại thông báo
    /// </summary>
    public enum NotificationType
    {
        Reaction = 1,      // Ai đó thả cảm xúc
        Share = 2,         // Ai đó chia sẻ bài
        Comment = 3,       // Ai đó bình luận (để mở rộng sau)
        Follow = 4,        // Ai đó theo dõi
        Mention = 5        // Ai đó nhắc đến
    }
}
