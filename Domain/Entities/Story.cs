using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class Story
    {
        // Matches database column names
        public int story_id { get; set; }
        public int user_id { get; set; }
        public string media_url { get; set; } = string.Empty;
        public string media_type { get; set; } = string.Empty; // "image" or "video"
        public string privacy { get; set; } = "public"; // "public", "friends", "private"
        public DateTime created_at { get; set; }
        public DateTime expires_at { get; set; }
        
        // Navigation properties
        public User User { get; set; } = null!;
        public ICollection<StoryView> Views { get; set; } = new List<StoryView>();
    }

    public class StoryView
    {
        // Matches database column names
        public int view_id { get; set; }
        public int story_id { get; set; }
        public int viewer_id { get; set; }
        public DateTime viewed_at { get; set; }

        // Navigation properties
        public Story Story { get; set; } = null!;
        public User Viewer { get; set; } = null!;
    }
}
