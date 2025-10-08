using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Domain.DTOs
{
    public class CommentDto
    {
        public Guid Id { get; set; }
        public Guid PostId { get; set; }
        public Guid AuthorId { get; set; }
        public string AuthorName { get; set; }
        public string AuthorUserName { get; set; }
        public string? AuthorProfileImageUrl { get; set; }
        public Guid? ParentCommentId { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int LikeCount { get; set; }
        public bool IsLikedByCurrentUser { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public List<CommentDto> Replies { get; set; } = new List<CommentDto>();
    }

    public class CommentCreateDto
    {
        public Guid PostId { get; set; }
        public Guid? ParentCommentId { get; set; }
        public string Content { get; set; }
    }

    public class CommentUpdateDto
    {
        public string Content { get; set; }
    }

    public class CommentListDto
    {
        public List<CommentDto> Comments { get; set; } = new List<CommentDto>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public bool HasNextPage { get; set; }
        public bool HasPreviousPage { get; set; }
    }
}

