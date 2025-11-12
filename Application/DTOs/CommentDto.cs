namespace UngDungMangXaHoi.Application.DTOs;

public class CommentDto
{
    public int CommentId { get; set; }
    public int PostId { get; set; }
    public int AccountId { get; set; }
    public int UserId { get; set; } // user_id từ bảng users (dùng cho navigation)
    public string AuthorName { get; set; } = string.Empty;
    public string? AuthorAvatar { get; set; }
    public string Content { get; set; } = string.Empty;
    public List<string> Hashtags { get; set; } = new();
    public int? ParentCommentId { get; set; }
    public List<MentionDto> Mentions { get; set; } = new();
    public Dictionary<string, int> ReactionCounts { get; set; } = new();
    public string? UserReactionType { get; set; }
    public int ReplyCount { get; set; }
    public List<CommentDto> Replies { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsEdited { get; set; }
}

public class MentionDto
{
    public int AccountId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int StartPosition { get; set; }
    public int Length { get; set; }
}

public class CreateCommentDto
{
    public int PostId { get; set; }
    public string Content { get; set; } = string.Empty;
    public int? ParentCommentId { get; set; }
}

public class UpdateCommentDto
{
    public string Content { get; set; } = string.Empty;
}

public class CommentReactionDto
{
    public int CommentReactionId { get; set; }
    public int CommentId { get; set; }
    public int AccountId { get; set; }
    public string ReactionType { get; set; } = "Like";
    public DateTime CreatedAt { get; set; }
}

public class CreateCommentReactionDto
{
    public int CommentId { get; set; }
    public string ReactionType { get; set; } = "Like";
}

public class CommentEditHistoryDto
{
    public int CommentEditHistoryId { get; set; }
    public int CommentId { get; set; }
    public string OldContent { get; set; } = string.Empty;
    public DateTime EditedAt { get; set; }
}
