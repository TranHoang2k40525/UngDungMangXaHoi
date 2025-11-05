using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class CommentLike
    {
        public int LikeId { get; set; }  // Đổi từ Id → LikeId để map với like_id
        public int CommentId { get; set; }
        public int UserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation Properties
        public Comment Comment { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
