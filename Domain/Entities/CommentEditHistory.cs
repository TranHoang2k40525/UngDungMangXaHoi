using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class CommentEditHistory
    {
        public int Id { get; set; }
        public int CommentId { get; set; }
        public string OldContent { get; set; } = string.Empty;
        public string NewContent { get; set; } = string.Empty;
        public DateTime EditedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation Property
        public Comment Comment { get; set; } = null!;
    }
}
