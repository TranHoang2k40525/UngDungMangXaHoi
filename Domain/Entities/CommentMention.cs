using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class CommentMention
    {
        public int Id { get; set; }
        public int CommentId { get; set; }
        public int MentionedUserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation Properties
        public Comment Comment { get; set; } = null!;
        public User MentionedUser { get; set; } = null!;
    }
}
