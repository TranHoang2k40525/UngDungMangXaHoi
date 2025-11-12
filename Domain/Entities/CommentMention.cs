namespace UngDungMangXaHoi.Domain.Entities;

public class CommentMention
{
    public int CommentMentionId { get; set; }
    
    // Reference to the comment
    public int CommentId { get; set; }
    public Comment Comment { get; set; } = null!;
    
    // Reference to the mentioned user
    public int MentionedAccountId { get; set; }
    public Account MentionedAccount { get; set; } = null!;
    
    // Position in text where mention occurs (for highlighting)
    public int StartPosition { get; set; }
    public int Length { get; set; }
    
    // Metadata
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
