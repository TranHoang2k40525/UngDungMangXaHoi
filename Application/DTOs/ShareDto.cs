using System;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class ShareDto
    {
        public int ShareId { get; set; }
        public int PostId { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = null!;
        public string? AvatarUrl { get; set; }
        public string? Caption { get; set; }
        public string Privacy { get; set; } = "public";
        public DateTimeOffset CreatedAt { get; set; }
    }

    public class CreateShareDto
    {
        public int PostId { get; set; }
        public string? Caption { get; set; }
        public string Privacy { get; set; } = "public";
    }
}
