using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAccountRepository _accountRepository;
        private readonly IAdminRepository _adminRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IOTPRepository _otpRepository;
        private readonly IEmailService _emailService;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly Application.Services.AuthService _authService;

        public AdminController(
            IAccountRepository accountRepository,
            IAdminRepository adminRepository,
            IPasswordHasher passwordHasher,
            IOTPRepository otpRepository,
            IEmailService emailService,
            IRefreshTokenRepository refreshTokenRepository,
            Application.Services.AuthService authService)
        {
            _accountRepository = accountRepository;
            _adminRepository = adminRepository;
            _passwordHasher = passwordHasher;
            _otpRepository = otpRepository;
            _emailService = emailService;
            _refreshTokenRepository = refreshTokenRepository;
            _authService = authService;
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(accountIdStr, out var accountId)) return Unauthorized("Invalid token");

            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null || account.Admin == null) return NotFound("Admin not found");
            var admin = account.Admin;

            // Return camelCase for JavaScript frontend
            var response = new {
                adminId = admin.admin_id,
                fullName = admin.full_name,
                email = account.email?.Value,
                phone = account.phone?.Value,
                bio = admin.bio,
                avatarUrl = admin.avatar_url?.Value,
                address = admin.address,
                hometown = admin.hometown,
                job = admin.job,
                website = admin.website,
                adminLevel = admin.admin_level,
                dateOfBirth = admin.date_of_birth.ToString("yyyy-MM-dd"),
                isPrivate = admin.is_private,
                gender = admin.gender.ToString()
            };

            return Ok(response);
        }

        public class UpdateProfileRequest
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
            public string? DateOfBirth { get; set; }
            public bool? IsPrivate { get; set; }
        }

        [Authorize]
        [HttpPut("update-profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(accountIdStr, out var accountId)) return Unauthorized("Invalid token");

            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null || account.Admin == null) return NotFound("Admin not found");

            // Do NOT allow email change here
            var admin = account.Admin;
            
            if (!string.IsNullOrWhiteSpace(request.FullName))
                admin.full_name = request.FullName;
                
            if (!string.IsNullOrWhiteSpace(request.Bio))
                admin.bio = request.Bio;
                
            if (!string.IsNullOrWhiteSpace(request.Address))
                admin.address = request.Address;
                
            if (!string.IsNullOrWhiteSpace(request.Hometown))
                admin.hometown = request.Hometown;
                
            if (!string.IsNullOrWhiteSpace(request.Job))
                admin.job = request.Job;
                
            if (!string.IsNullOrWhiteSpace(request.Website))
                admin.website = request.Website;
            
            if (!string.IsNullOrWhiteSpace(request.AvatarUrl))
            {
                admin.avatar_url = request.AvatarUrl;
            }

            if (!string.IsNullOrWhiteSpace(request.Gender) && Enum.TryParse<Domain.Entities.Gender>(request.Gender, out var gender))
            {
                admin.gender = gender;
            }

            if (!string.IsNullOrWhiteSpace(request.DateOfBirth) && DateTime.TryParse(request.DateOfBirth, out var dob))
            {
                admin.date_of_birth = new DateTimeOffset(dob, TimeSpan.Zero);
            }

            // Update is_private
            if (request.IsPrivate.HasValue)
            {
                admin.is_private = request.IsPrivate.Value;
            }

            // If phone is provided, update account.phone
            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                account.phone = new PhoneNumber(request.Phone);
            }

            account.updated_at = DateTimeOffset.UtcNow;
            
            // Update both Account and Admin entities
            await _accountRepository.UpdateAsync(account);
            await _adminRepository.UpdateAsync(admin);

            return Ok(new { success = true, message = "Cập nhật thông tin thành công" });
        }

        public class ChangePasswordRequest
        {
            public string OldPassword { get; set; } = null!;
            public string NewPassword { get; set; } = null!;
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(accountIdStr, out var accountId)) return Unauthorized("Invalid token");

            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null || account.Admin == null) return NotFound("Admin not found");

            // Xác thực mật khẩu cũ
            if (!_passwordHasher.VerifyPassword(request.OldPassword, account.password_hash.Value))
            {
                return BadRequest("Mật khẩu hiện tại không đúng.");
            }

            // Kiểm tra số lần thử
            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(account.account_id, "change_password_admin");
            if (failedAttempts >= 5)
            {
                return StatusCode(429, "Quá nhiều lần thử. Vui lòng thử lại sau 2 phút.");
            }

            var admin = account.Admin;
            var fullName = admin.full_name;

            // Tạo OTP
            var otp = await _authService.GenerateOtpAsync();
            var otpHash = _passwordHasher.HashPassword(otp);
            var otpEntity = new Domain.Entities.OTP
            {
                account_id = account.account_id,
                otp_hash = otpHash,
                purpose = "change_password_admin",
                expires_at = DateTimeOffset.UtcNow.AddMinutes(1),
                used = false,
                created_at = DateTimeOffset.UtcNow
            };

            await _otpRepository.AddAsync(otpEntity);
            await _emailService.SendOtpEmailAsync(account.email?.Value ?? "", otp, "change_password_admin", fullName);

            return Ok(new { message = "OTP đã được gửi đến email. Vui lòng xác thực trong vòng 1 phút." });
        }

        public class VerifyChangePasswordOtpRequest
        {
            public string Otp { get; set; } = null!;
            public string NewPassword { get; set; } = null!;
        }

        [Authorize]
        [HttpPost("verify-change-password-otp")]
        public async Task<IActionResult> VerifyChangePasswordOtp([FromBody] VerifyChangePasswordOtpRequest request)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(accountIdStr, out var accountId)) return Unauthorized("Invalid token");

            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null || account.Admin == null) return NotFound("Admin not found");

            var otp = await _otpRepository.GetByAccountIdAsync(account.account_id, "change_password_admin");
            if (otp == null || otp.expires_at < DateTimeOffset.UtcNow)
            {
                return BadRequest("OTP đã hết hạn hoặc không hợp lệ.");
            }

            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(account.account_id, "change_password_admin");
            if (failedAttempts >= 5)
            {
                await _otpRepository.DeleteAsync(otp.otp_id);
                return StatusCode(429, "Quá nhiều lần thử thất bại. Vui lòng thử lại sau 2 phút.");
            }

            if (!_passwordHasher.VerifyPassword(request.Otp, otp.otp_hash))
            {
                await _otpRepository.UpdateAsync(otp);
                return BadRequest("OTP không hợp lệ.");
            }

            // Cập nhật mật khẩu mới
            account.password_hash = new PasswordHash(_passwordHasher.HashPassword(request.NewPassword));
            account.updated_at = DateTimeOffset.UtcNow;
            await _accountRepository.UpdateAsync(account);

            // Xóa tất cả refresh token
            await _refreshTokenRepository.DeleteByAccountIdAsync(account.account_id);

            // Xóa OTP
            await _otpRepository.DeleteAsync(otp.otp_id);

            return Ok(new { success = true, message = "Đổi mật khẩu thành công." });
        }
    }
}
