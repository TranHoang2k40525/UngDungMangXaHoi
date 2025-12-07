namespace UngDungMangXaHoi.Domain.Entities;

public class ContentModeration
{
    public int ModerationID { get; set; }
    public string ContentType { get; set; } = string.Empty; // "Post" or "Comment"
    public int ContentID { get; set; }
    public int AccountId { get; set; }
    public int? PostId { get; set; }
    public int? CommentId { get; set; }
    public double AIConfidence { get; set; }
    public string ToxicLabel { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // "pending", "approved", "rejected"
    public DateTime CreatedAt { get; set; }
}
