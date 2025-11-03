using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Domain.Entities
{
    /// <summary>
    /// Entity cho bài đăng (Posts table)
    /// </summary>
    public class Post
    {
        public int post_id { get; set; }
        public int user_id { get; set; }
        public string? caption { get; set; }
        public string? location { get; set; }
        public string privacy { get; set; } = "public";  // public/private/followers
        public bool is_visible { get; set; } = true;
        public DateTimeOffset created_at { get; set; }

        // Navigation
        public User User { get; set; } = null!;
        public ICollection<PostMedia> Media { get; set; } = new List<PostMedia>();
    }

    /// <summary>
    /// Entity cho media của bài đăng (PostMedia table)
    /// </summary>
    public class PostMedia
    {
        public int media_id { get; set; }
        public int post_id { get; set; }
        public string media_url { get; set; } = null!;
        public string media_type { get; set; } = "Image";  // Image/Video
        public int media_order { get; set; } = 0;
        public int? duration { get; set; }  // Cho video
        public DateTimeOffset created_at { get; set; }

        // Navigation
        public Post Post { get; set; } = null!;
    }
}
