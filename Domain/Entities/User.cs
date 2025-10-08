using System;
using System.Collections.Generic;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class User
    {
        public Guid Id { get; set; }
        public UserName UserName { get; set; }
        public Email Email { get; set; }
        public PasswordHash PasswordHash { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public ImageUrl? ProfileImageUrl { get; set; }
        public ImageUrl? CoverImageUrl { get; set; }
        public string? Bio { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsActive { get; set; }

        // Navigation properties
        public virtual ICollection<Post> Posts { get; set; } = new List<Post>();
        public virtual ICollection<Comment> Comments { get; set; } = new List<Comment>();
        public virtual ICollection<Friendship> SentFriendRequests { get; set; } = new List<Friendship>();
        public virtual ICollection<Friendship> ReceivedFriendRequests { get; set; } = new List<Friendship>();

        public User()
        {
            Id = Guid.NewGuid();
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
            IsActive = true;
        }

        public User(UserName userName, Email email, PasswordHash passwordHash, string firstName, string lastName, DateTime dateOfBirth)
            : this()
        {
            UserName = userName;
            Email = email;
            PasswordHash = passwordHash;
            FirstName = firstName;
            LastName = lastName;
            DateOfBirth = dateOfBirth;
        }

        public void UpdateProfile(string firstName, string lastName, string? bio, ImageUrl? profileImageUrl, ImageUrl? coverImageUrl)
        {
            FirstName = firstName;
            LastName = lastName;
            Bio = bio;
            ProfileImageUrl = profileImageUrl;
            CoverImageUrl = coverImageUrl;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Deactivate()
        {
            IsActive = false;
            UpdatedAt = DateTime.UtcNow;
        }
    }
}

