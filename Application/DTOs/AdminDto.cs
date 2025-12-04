using System;

namespace UngDungMangXaHoi.Application.DTOs
{
    
    public class AdminProfileDto
    {
        public int AdminId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Bio { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Address { get; set; }
        public string? Hometown { get; set; }
        public string? Job { get; set; }
        public string? Website { get; set; }
        public string? AdminLevel { get; set; }
        public string? DateOfBirth { get; set; }
        public bool IsPrivate { get; set; }
        public string? Gender { get; set; }
    }


    public class AdminUpdateProfileRequest
    {
        public string? FullName { get; set; }
        public string? Phone { get; set; }
        public string? Bio { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Address { get; set; }
        public string? Hometown { get; set; }
        public string? Job { get; set; }
        public string? Website { get; set; }
        public string? Gender { get; set; }
        // Keep as string to preserve controller parsing behavior; controller can parse to DateTime when provided
        public string? DateOfBirth { get; set; }
        public bool? IsPrivate { get; set; }
    }

    public class AdminChangePasswordRequest
    {
        public string OldPassword { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
    }

    public class AdminVerifyChangePasswordOtpRequest
    {
        public string Otp { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
    }
}
