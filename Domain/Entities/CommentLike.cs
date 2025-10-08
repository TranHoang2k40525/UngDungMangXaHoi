using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class CommentLike
    {
        public Guid Id { get; set; }
        public Guid CommentId { get; set; }
        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; }

        // Navigation properties
        public virtual Comment Comment { get; set; }
        public virtual User User { get; set; }

        public CommentLike()
        {
            Id = Guid.NewGuid();
            CreatedAt = DateTime.UtcNow;
        }

        public CommentLike(Guid commentId, Guid userId) : this()
        {
            CommentId = commentId;
            UserId = userId;
        }
    }
}

