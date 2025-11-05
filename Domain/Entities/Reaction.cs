using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    /// <summary>
    /// Entity cho cảm xúc/reaction trên bài đăng
    /// </summary>
    public class Reaction
    {
        public int reaction_id { get; set; }
        public int post_id { get; set; }
        public int user_id { get; set; }
        public ReactionType reaction_type { get; set; }
        public DateTimeOffset created_at { get; set; }

        // Navigation properties
        public Post Post { get; set; } = null!;
        public User User { get; set; } = null!;
    }

    /// <summary>
    /// Các loại cảm xúc
    /// </summary>
    public enum ReactionType
    {
        Like = 1,      // Thích
        Love = 2,      // Yêu thích
        Haha = 3,      // Haha
        Wow = 4,       // Wow
        Sad = 5,       // Buồn
        Angry = 6      // Phẫn nộ
    }
}
