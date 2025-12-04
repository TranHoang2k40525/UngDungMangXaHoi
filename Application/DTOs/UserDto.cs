using System;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class PublicProfileDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public string? Bio { get; set; }
        public string? Website { get; set; }
        public string? Address { get; set; }
        public string? Hometown { get; set; }
        public string Gender { get; set; } = string.Empty;
        public int PostsCount { get; set; }
        public int FollowersCount { get; set; }
        public int FollowingCount { get; set; }
        public bool IsFollowing { get; set; }
    }
}
