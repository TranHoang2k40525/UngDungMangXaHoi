namespace UngDungMangXaHoi.Domain.Entities;

public class Report
{
    public int ReportId { get; set; }
    public int ReporterId { get; set; }
    public int? ReportedUserId { get; set; }
    public string ContentType { get; set; } = string.Empty; // "post", "comment", "user", "message"
    public int? ContentId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "pending"; // "pending", "resolved", "rejected"
    public string? AdminNote { get; set; }
    public int? ResolvedBy { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    // Navigation properties
    public virtual User? Reporter { get; set; }
    public virtual User? ReportedUser { get; set; }
    public virtual Admin? ResolvedByAdmin { get; set; }
}
