using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class Comment
    {
        public int Id { get; set; }
        public string Content { get; set; } = string.Empty;
        
        // Foreign Keys
        public int PostId { get; set; }
        public int UserId { get; set; }
        public int? ParentCommentId { get; set; } // null = root comment, có giá trị = reply
        
        // Mentions và Hashtags (stored as JSON array or comma-separated)
        public string? MentionedUserIds { get; set; } // e.g., "1,5,10" or JSON array
        public string? Hashtags { get; set; } // e.g., "react,dotnet,coding"
        
        // Metadata
        public int LikesCount { get; set; } = 0;
        public int RepliesCount { get; set; } = 0;
        public bool IsDeleted { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation Properties
        public Post Post { get; set; } = null!;
        public User User { get; set; } = null!;
        public Comment? ParentComment { get; set; }
        public ICollection<Comment> Replies { get; set; } = new List<Comment>();
        public ICollection<CommentLike> CommentLikes { get; set; } = new List<CommentLike>();
    }
}
