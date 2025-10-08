using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Domain.DTOs
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public string UserName { get; set; }
        public string Email { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string? ProfileImageUrl { get; set; }
        public string? CoverImageUrl { get; set; }
        public string? Bio { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }
        public int FriendsCount { get; set; }
        public int PostsCount { get; set; }
    }

    public class UserCreateDto
    {
        public string UserName { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTime DateOfBirth { get; set; }
    }

    public class UserUpdateDto
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string? Bio { get; set; }
        public string? ProfileImageUrl { get; set; }
        public string? CoverImageUrl { get; set; }
    }

    public class UserLoginDto
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class UserSearchDto
    {
        public Guid Id { get; set; }
        public string UserName { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string? ProfileImageUrl { get; set; }
        public bool IsFriend { get; set; }
        public bool HasPendingRequest { get; set; }
    }
}

