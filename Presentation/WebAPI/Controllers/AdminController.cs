using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Application.DTOs;

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
        private readonly Application.Services.AdminService _adminService;

        public AdminController(
            IAccountRepository accountRepository,
            IAdminRepository adminRepository,
            IPasswordHasher passwordHasher,
            IOTPRepository otpRepository,
            IEmailService emailService,
            IRefreshTokenRepository refreshTokenRepository,
            Application.Services.AuthService authService,
            Application.Services.AdminService adminService)
        {
            _accountRepository = accountRepository;
            _adminRepository = adminRepository;
            _passwordHasher = passwordHasher;
            _otpRepository = otpRepository;
            _emailService = emailService;
            _refreshTokenRepository = refreshTokenRepository;
            _authService = authService;
            _adminService = adminService;
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(accountIdStr, out var accountId)) return Unauthorized("Invalid token");

            var profile = await _adminService.GetProfileAsync(accountId);
            if (profile == null) return NotFound("Admin not found");

            return Ok(profile);
        }

        // Admin profile DTOs moved to Application.DTOs.AdminDto -> AdminUpdateProfileRequest

        [Authorize]
        [HttpPut("update-profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] AdminUpdateProfileRequest request)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(accountIdStr, out var accountId)) return Unauthorized("Invalid token");

            var ok = await _adminService.UpdateProfileAsync(accountId, request);
            if (!ok) return NotFound("Admin not found");
            return Ok(new { success = true, message = "Cập nhật thông tin thành công" });
        }

        // Change password DTOs moved to Application.DTOs.AdminDto -> AdminChangePasswordRequest

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] AdminChangePasswordRequest request)
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

            var (success, message) = await _adminService.InitiateChangePasswordAsync(accountId);
            if (!success)
            {
                if (message != null && message.Contains("Quá nhiều lần thử"))
                    return StatusCode(429, message);
                return BadRequest(message);
            }

            return Ok(new { message });
        }

        // Verify change password DTO moved to Application.DTOs.AdminDto -> AdminVerifyChangePasswordOtpRequest

        [Authorize]
        [HttpPost("verify-change-password-otp")]
        public async Task<IActionResult> VerifyChangePasswordOtp([FromBody] AdminVerifyChangePasswordOtpRequest request)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(accountIdStr, out var accountId)) return Unauthorized("Invalid token");

            var (success, message) = await _adminService.VerifyChangePasswordOtpAsync(accountId, request);
            if (!success)
            {
                if (message != null && message.Contains("Quá nhiều lần thử"))
                    return StatusCode(429, message);
                return BadRequest(message);
            }

            return Ok(new { success = true, message });
        }
    }
}
