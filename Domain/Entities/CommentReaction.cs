namespace UngDungMangXaHoi.Domain.Entities;

public class CommentReaction
{
    public int CommentReactionId { get; set; }
    
    // Reference to the comment
    public int CommentId { get; set; }
    public Comment Comment { get; set; } = null!;
    
    // Reference to the user who reacted
    public int AccountId { get; set; }
    public Account Account { get; set; } = null!;
    
    // Type of reaction: Like, Love, Haha, Wow, Sad, Angry
    public string ReactionType { get; set; } = "Like";
    
    // Metadata
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
