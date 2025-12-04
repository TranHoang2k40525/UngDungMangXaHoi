using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Application.Services
{
    public class AdminService
    {
        private readonly IAccountRepository _accountRepository;
        private readonly IAdminRepository _adminRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IOTPRepository _otpRepository;
        private readonly IEmailService _emailService;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly AuthService _authService;

        public AdminService(
            IAccountRepository accountRepository,
            IAdminRepository adminRepository,
            IPasswordHasher passwordHasher,
            IOTPRepository otpRepository,
            IEmailService emailService,
            IRefreshTokenRepository refreshTokenRepository,
            AuthService authService)
        {
            _accountRepository = accountRepository;
            _adminRepository = adminRepository;
            _passwordHasher = passwordHasher;
                _otpRepository = otpRepository;
            _emailService = emailService;
            _refreshTokenRepository = refreshTokenRepository;
            _authService = authService;
        }

        public async Task<AdminProfileDto?> GetProfileAsync(int accountId)
        {
            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null || account.Admin == null) return null;
            var admin = account.Admin;

            var profile = new AdminProfileDto
            {
                AdminId = admin.admin_id,
                FullName = admin.full_name,
                Email = account.email?.Value,
                Phone = account.phone?.Value,
                Bio = admin.bio,
                AvatarUrl = admin.avatar_url?.Value,
                Address = admin.address,
                Hometown = admin.hometown,
                Job = admin.job,
                Website = admin.website,
                AdminLevel = admin.admin_level,
                DateOfBirth = admin.date_of_birth.ToString("yyyy-MM-dd"),
                IsPrivate = admin.is_private,
                Gender = admin.gender.ToString()
            };

            return profile;
        }

        public async Task<bool> UpdateProfileAsync(int accountId, AdminUpdateProfileRequest request)
        {
            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null || account.Admin == null) return false;

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
                admin.avatar_url = request.AvatarUrl;

            if (!string.IsNullOrWhiteSpace(request.Gender) && Enum.TryParse<Domain.Entities.Gender>(request.Gender, out var gender))
            {
                admin.gender = gender;
            }

            if (!string.IsNullOrWhiteSpace(request.DateOfBirth) && DateTime.TryParse(request.DateOfBirth, out var dob))
            {
                admin.date_of_birth = new DateTimeOffset(dob, TimeSpan.Zero);
            }

            if (request.IsPrivate.HasValue)
            {
                admin.is_private = request.IsPrivate.Value;
            }

            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                account.phone = new PhoneNumber(request.Phone);
            }

            account.updated_at = DateTimeOffset.UtcNow;

            await _accountRepository.UpdateAsync(account);
            await _adminRepository.UpdateAsync(admin);

            return true;
        }

        public async Task<(bool success, string message)> InitiateChangePasswordAsync(int accountId)
        {
            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null || account.Admin == null) return (false, "Admin not found");

                var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(account.account_id, "change_password_admin");
            if (failedAttempts >= 5)
            {
                return (false, "Quá nhiều lần thử. Vui lòng thử lại sau 2 phút.");
            }

            var fullName = account.Admin.full_name;
            var otp = await _authService.GenerateOtpAsync();
            var otpHash = _passwordHasher.HashPassword(otp);
            var otpEntity = new OTP
            {
                account_id = account.account_id,
                otp_hash = otpHash,
                purpose = "change_password_admin",
                expires_at = DateTimeOffset.UtcNow.AddMinutes(1),
                used = false,
                created_at = DateTimeOffset.UtcNow
            };

            await _otpRepository.AddAsync(otpEntity);
            await _emailService.SendOtpEmailAsync(account.email?.Value ?? string.Empty, otp, "change_password_admin", fullName);

            return (true, "OTP đã được gửi đến email. Vui lòng xác thực trong vòng 1 phút.");
        }

        public async Task<(bool success, string message)> VerifyChangePasswordOtpAsync(int accountId, AdminVerifyChangePasswordOtpRequest request)
        {
            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null || account.Admin == null) return (false, "Admin not found");

            var otp = await _otpRepository.GetByAccountIdAsync(account.account_id, "change_password_admin");
            if (otp == null || otp.expires_at < DateTimeOffset.UtcNow)
            {
                return (false, "OTP đã hết hạn hoặc không hợp lệ.");
            }

                var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(account.account_id, "change_password_admin");
            if (failedAttempts >= 5)
            {
                await _otpRepository.DeleteAsync(otp.otp_id);
                return (false, "Quá nhiều lần thử thất bại. Vui lòng thử lại sau 2 phút.");
            }

            if (!_passwordHasher.VerifyPassword(request.Otp, otp.otp_hash))
            {
                await _otpRepository.UpdateAsync(otp);
                return (false, "OTP không hợp lệ.");
            }

            account.password_hash = new PasswordHash(_passwordHasher.HashPassword(request.NewPassword));
            account.updated_at = DateTimeOffset.UtcNow;
            await _accountRepository.UpdateAsync(account);

            await _refreshTokenRepository.DeleteByAccountIdAsync(account.account_id);
            await _otpRepository.DeleteAsync(otp.otp_id);

            return (true, "Đổi mật khẩu thành công.");
        }
    }
}