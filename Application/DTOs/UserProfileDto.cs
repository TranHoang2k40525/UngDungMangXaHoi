using System;

namespace UngDungMangXaHoi.Application.DTOs
{
    /// <summary>
    /// DTO để trả về thông tin profile đầy đủ của user
    /// </summary>
    public class UserProfileDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = null!;
        public int AccountId { get; set; }
        public string Email { get; set; } = null!;
        public string? Phone { get; set; }
        public string FullName { get; set; } = null!;
        public string Gender { get; set; } = null!;
        public string? Bio { get; set; }
        public string? AvatarUrl { get; set; }
        public bool IsPrivate { get; set; }
        public DateTimeOffset DateOfBirth { get; set; }
        public string? Address { get; set; }
        public string? Hometown { get; set; }
        public string? Job { get; set; }
        public string? Website { get; set; }
        public string AccountStatus { get; set; } = null!;
        public DateTimeOffset CreatedAt { get; set; }
        // Aggregated counters for UI
        public int PostCount { get; set; }
        public int FollowerCount { get; set; }
        public int FollowingCount { get; set; }
        public string? AccountType { get; set; }  // "User" hoặc "Business"
    }

    /// <summary>
    /// DTO để cập nhật thông tin cơ bản (không cần OTP)
    /// </summary>
    public class UpdateProfileRequest
    {
        public string? FullName { get; set; }
        public string? Gender { get; set; }  // "Nam", "Nữ", "Khác"
        public string? Bio { get; set; }
        public bool? IsPrivate { get; set; }
        public DateTimeOffset? DateOfBirth { get; set; }
        public string? Address { get; set; }
        public string? Hometown { get; set; }
        public string? Job { get; set; }
        public string? Website { get; set; }
    }

    /// <summary>
    /// DTO để yêu cầu OTP thay đổi email
    /// </summary>
    public class RequestChangeEmailDto
    {
        public string NewEmail { get; set; } = null!;
    }

    /// <summary>
    /// DTO để verify OTP và thay đổi email
    /// </summary>
    public class VerifyChangeEmailDto
    {
        public string NewEmail { get; set; } = null!;
        public string Otp { get; set; } = null!;
    }

    /// <summary>
    /// DTO để yêu cầu OTP thay đổi SĐT
    /// </summary>
    public class RequestChangePhoneDto
    {
        public string NewPhone { get; set; } = null!;
    }

    /// <summary>
    /// DTO để verify OTP và thay đổi SĐT
    /// </summary>
    public class VerifyChangePhoneDto
    {
        public string NewPhone { get; set; } = null!;
        public string Otp { get; set; } = null!;
    }

    /// <summary>
    /// DTO để upload avatar (với option đăng bài)
    /// </summary>
    public class UpdateAvatarRequest
    {
        public bool CreatePost { get; set; } = false;  // Có đăng bài không?
        public string? PostCaption { get; set; }  // Caption cho bài đăng
        public string? PostLocation { get; set; }  // Location cho bài đăng
        public string PostPrivacy { get; set; } = "public";  // Privacy: public/private/followers
    }
}
