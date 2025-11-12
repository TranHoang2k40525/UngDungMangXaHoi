namespace UngDungMangXaHoi.Domain.Entities;

public class CommentEditHistory
{
    public int CommentEditHistoryId { get; set; }
    
    // Relationship to Comment
    public int CommentId { get; set; }
    public Comment Comment { get; set; } = null!;
    
    // Previous content before edit
    public string OldContent { get; set; } = string.Empty;
    
    // When was it edited
    public DateTime EditedAt { get; set; } = DateTime.UtcNow;
}
