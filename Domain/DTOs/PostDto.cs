using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Domain.DTOs
{
    public class PostDto
    {
        public Guid Id { get; set; }
        public Guid AuthorId { get; set; }
        public string AuthorName { get; set; }
        public string AuthorUserName { get; set; }
        public string? AuthorProfileImageUrl { get; set; }
        public string Content { get; set; }
        public List<string> ImageUrls { get; set; } = new List<string>();
        public List<string> VideoUrls { get; set; } = new List<string>();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int LikeCount { get; set; }
        public int CommentCount { get; set; }
        public int ShareCount { get; set; }
        public bool IsLikedByCurrentUser { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
    }

    public class PostCreateDto
    {
        public string Content { get; set; }
        public List<string>? ImageUrls { get; set; }
        public List<string>? VideoUrls { get; set; }
    }

    public class PostUpdateDto
    {
        public string Content { get; set; }
        public List<string>? ImageUrls { get; set; }
        public List<string>? VideoUrls { get; set; }
    }

    public class PostFeedDto
    {
        public List<PostDto> Posts { get; set; } = new List<PostDto>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public bool HasNextPage { get; set; }
        public bool HasPreviousPage { get; set; }
    }
}

