using System;
using System.Collections.Generic;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class Post
    {
        public Guid Id { get; set; }
        public Guid AuthorId { get; set; }
        public string Content { get; set; }
        public List<ImageUrl> ImageUrls { get; set; } = new List<ImageUrl>();
        public List<string> VideoUrls { get; set; } = new List<string>();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public int LikeCount { get; set; }
        public int CommentCount { get; set; }
        public int ShareCount { get; set; }

        // Navigation properties
        public virtual User Author { get; set; }
        public virtual ICollection<Comment> Comments { get; set; } = new List<Comment>();
        public virtual ICollection<PostLike> Likes { get; set; } = new List<PostLike>();

        public Post()
        {
            Id = Guid.NewGuid();
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
            IsDeleted = false;
            LikeCount = 0;
            CommentCount = 0;
            ShareCount = 0;
        }

        public Post(Guid authorId, string content) : this()
        {
            AuthorId = authorId;
            Content = content;
        }

        public void UpdateContent(string newContent)
        {
            Content = newContent;
            UpdatedAt = DateTime.UtcNow;
        }

        public void AddImage(ImageUrl imageUrl)
        {
            ImageUrls.Add(imageUrl);
            UpdatedAt = DateTime.UtcNow;
        }

        public void AddVideo(string videoUrl)
        {
            VideoUrls.Add(videoUrl);
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

        public void IncrementCommentCount()
        {
            CommentCount++;
            UpdatedAt = DateTime.UtcNow;
        }

        public void DecrementCommentCount()
        {
            if (CommentCount > 0)
            {
                CommentCount--;
                UpdatedAt = DateTime.UtcNow;
            }
        }

        public void IncrementShareCount()
        {
            ShareCount++;
            UpdatedAt = DateTime.UtcNow;
        }
    }
}

