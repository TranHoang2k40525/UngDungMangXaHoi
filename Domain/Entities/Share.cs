using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    /// <summary>
    /// Entity cho chia sẻ bài đăng
    /// </summary>
    public class Share
    {
        public int share_id { get; set; }
        public int post_id { get; set; }
        public int user_id { get; set; }
        public string? caption { get; set; }  // Nội dung chia sẻ kèm theo
        public string privacy { get; set; } = "public";  // public/private/followers
        public DateTimeOffset created_at { get; set; }

        // Navigation properties
        public Post Post { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
