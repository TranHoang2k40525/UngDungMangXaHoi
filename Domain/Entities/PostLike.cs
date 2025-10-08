using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class PostLike
    {
        public Guid Id { get; set; }
        public Guid PostId { get; set; }
        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; }

        // Navigation properties
        public virtual Post Post { get; set; }
        public virtual User User { get; set; }

        public PostLike()
        {
            Id = Guid.NewGuid();
            CreatedAt = DateTime.UtcNow;
        }

        public PostLike(Guid postId, Guid userId) : this()
        {
            PostId = postId;
            UserId = userId;
        }
    }
}

