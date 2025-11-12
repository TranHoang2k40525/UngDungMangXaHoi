namespace UngDungMangXaHoi.Domain.Entities;

public class Comment
{
    public int CommentId { get; set; }
    
    // Relationship to Post
    public int PostId { get; set; }
    public Post Post { get; set; } = null!;
    
    // Relationship to User
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    
    // Comment content
    public string Content { get; set; } = string.Empty;
    
    // Hashtags extracted from content (stored as comma-separated values)
    public string? Hashtags { get; set; }
    
    // For nested replies - if null, this is a top-level comment
    public int? ParentCommentId { get; set; }
    public Comment? ParentComment { get; set; }
    
    // Collection of child replies
    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
    
    // Mentions in this comment
    public ICollection<CommentMention> Mentions { get; set; } = new List<CommentMention>();
    
    // Reactions to this comment
    public ICollection<CommentReaction> Reactions { get; set; } = new List<CommentReaction>();
    
    // Edit history
    public ICollection<CommentEditHistory> EditHistory { get; set; } = new List<CommentEditHistory>();
    
    // Counters (computed from collections or stored)
    public int LikesCount { get; set; } = 0;
    public int RepliesCount { get; set; } = 0;
    
    // Metadata
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
    public bool IsVisible { get; set; } = true;
    public bool IsEdited { get; set; } = false;
    
    // For backward compatibility with database CSV fields
    public string? MentionedUserIds { get; set; }
}
