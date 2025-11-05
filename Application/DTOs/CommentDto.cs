using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class CommentDto
    {
        public int Id { get; set; }
        public string Content { get; set; } = string.Empty;
        public int PostId { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public int? ParentCommentId { get; set; }
        public List<int> MentionedUserIds { get; set; } = new List<int>();
        public List<string> MentionedUsernames { get; set; } = new List<string>();
        public List<string> Hashtags { get; set; } = new List<string>();
        public int LikesCount { get; set; }
        public int RepliesCount { get; set; }
        public bool IsLikedByCurrentUser { get; set; }
        public bool IsEdited { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<CommentDto>? Replies { get; set; }
    }

    public class CreateCommentRequest
    {
        public string Content { get; set; } = string.Empty;
        public int PostId { get; set; }
        public int? ParentCommentId { get; set; } // null = root comment, has value = reply
    }

    public class UpdateCommentRequest
    {
        public string Content { get; set; } = string.Empty;
    }

    public class CommentResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public CommentDto? Comment { get; set; }
    }

    public class CommentsListResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public List<CommentDto> Comments { get; set; } = new List<CommentDto>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}
