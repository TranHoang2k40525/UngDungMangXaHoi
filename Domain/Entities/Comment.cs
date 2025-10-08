using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class Comment
    {
        public Guid Id { get; set; }
        public Guid PostId { get; set; }
        public Guid AuthorId { get; set; }
        public Guid? ParentCommentId { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public int LikeCount { get; set; }

        // Navigation properties
        public virtual Post Post { get; set; }
        public virtual User Author { get; set; }
        public virtual Comment? ParentComment { get; set; }
        public virtual ICollection<Comment> Replies { get; set; } = new List<Comment>();
        public virtual ICollection<CommentLike> Likes { get; set; } = new List<CommentLike>();

        public Comment()
        {
            Id = Guid.NewGuid();
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
            IsDeleted = false;
            LikeCount = 0;
        }

        public Comment(Guid postId, Guid authorId, string content, Guid? parentCommentId = null) : this()
        {
            PostId = postId;
            AuthorId = authorId;
            Content = content;
            ParentCommentId = parentCommentId;
        }

        public void UpdateContent(string newContent)
        {
            Content = newContent;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Delete()
        {
            IsDeleted = true;
            UpdatedAt = DateTime.UtcNow;
        }

        public void IncrementLikeCount()
        {
            LikeCount++;
            UpdatedAt = DateTime.UtcNow;
        }

        public void DecrementLikeCount()
        {
            if (LikeCount > 0)
            {
                LikeCount--;
                UpdatedAt = DateTime.UtcNow;
            }
        }
    }
}

