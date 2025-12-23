using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class StoryDto
    {
        public int Id { get; set; } = 0;
        public int UserId { get; set; } = 0;
        public string UserName { get; set; } = string.Empty;
        public string UserAvatar { get; set; } = string.Empty;
        public string MediaUrl { get; set; } = string.Empty;
        public string MediaType { get; set; } = string.Empty;
        public string Privacy { get; set; } = "public";
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public int ViewCount { get; set; } = 0;
        public bool HasUserViewed { get; set; } = false;
    }

    public class CreateStoryDto
    {
        public string MediaType { get; set; } = string.Empty; // "image" or "video"
        public string Privacy { get; set; } = "public";
        public byte[] MediaContent { get; set; } = Array.Empty<byte>();
        public string FileName { get; set; } = string.Empty;
        public int UserId { get; set; }
    }

    public class StoryViewerDto
    {
        public int ViewerId { get; set; }
        public string ViewerName { get; set; } = string.Empty;
        public string ViewerAvatar { get; set; } = string.Empty;
        public DateTime ViewedAt { get; set; }
    }

    // DTO for grouped stories by user in feed
    public class UserStoriesGroupDto
    {
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserAvatar { get; set; } = string.Empty;
        public List<StoryDto> Stories { get; set; } = new List<StoryDto>();
    }
}
