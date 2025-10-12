using System;
using System.Security.Claims;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Infrastructure.Services;
using Microsoft.Extensions.Configuration;

namespace UngDungMangXaHoi.Application.Services
{
    public class AuthService : ITokenService
    {
        private readonly IAccountRepository _accountRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly JwtTokenService _jwtService;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly ILoginHistoryRepository _loginHistoryRepository;

        public AuthService(
            IAccountRepository accountRepository,
            IPasswordHasher passwordHasher,
            JwtTokenService jwtService,
            IRefreshTokenRepository refreshTokenRepository,
            ILoginHistoryRepository loginHistoryRepository)
        {
            _accountRepository = accountRepository;
            _passwordHasher = passwordHasher;
            _jwtService = jwtService;
            _refreshTokenRepository = refreshTokenRepository;
            _loginHistoryRepository = loginHistoryRepository;
        }

        public async Task<(string AccessToken, string RefreshToken)> DangNhapAsync(string emailOrPhone, string password, string accountType, string ipAddress = "", string deviceInfo = "")
        {
            Account? account = null;

            // Kiểm tra xem đầu vào là email hay số điện thoại
            if (emailOrPhone.Contains("@"))
            {
                var email = new Email(emailOrPhone);
                account = await _accountRepository.GetByEmailAsync(email);
            }
            else
            {
                account = await _accountRepository.GetByPhoneAsync(emailOrPhone);
            }

            if (account == null || account.account_type.ToString() != accountType)
                throw new UnauthorizedAccessException("Thông tin đăng nhập không chính xác");

            if (!_passwordHasher.VerifyPassword(password, account.password_hash.Value))
                throw new UnauthorizedAccessException("Mật khẩu không chính xác");

            // Xóa refresh token cũ nếu có
            await _refreshTokenRepository.DeleteByAccountIdAsync(account.account_id);

            var accessToken = _jwtService.GenerateAccessToken(account);
            var refreshTokenValue = _jwtService.GenerateRefreshToken(account);

            // Lưu refresh token vào database
            var refreshToken = new RefreshToken
            {
                account_id = account.account_id,
                refresh_token = refreshTokenValue,
                expires_at = DateTimeOffset.UtcNow.AddDays(30),
                created_at = DateTimeOffset.UtcNow
            };
            await _refreshTokenRepository.AddAsync(refreshToken);

            // Ghi lại lịch sử đăng nhập
            var loginHistory = new LoginHistory
            {
                account_id = account.account_id,
                ip_address = ipAddress,
                device_info = deviceInfo,
                login_time = DateTimeOffset.UtcNow
            };
            await _loginHistoryRepository.AddAsync(loginHistory);

            return (accessToken, refreshTokenValue);
        }

        public async Task<bool> DangKyNguoiDungAsync(string username, string fullName, 
            DateTime dateOfBirth, string email, string phone, string password, string gender)
        {
            // Kiểm tra email đã tồn tại
            var emailObj = new Email(email);
            if (await _accountRepository.ExistsByEmailAsync(emailObj))
                throw new InvalidOperationException("Email đã được sử dụng");

            // Kiểm tra số điện thoại đã tồn tại
            if (await _accountRepository.ExistsByPhoneAsync(phone))
                throw new InvalidOperationException("Số điện thoại đã được sử dụng");

            var passwordHash = _passwordHasher.HashPassword(password);

            var account = new Account
            {
                email = emailObj,
                phone = new PhoneNumber(phone),
                password_hash = new PasswordHash(passwordHash),
                account_type = AccountType.User,
                status = "active",
                created_at = DateTimeOffset.UtcNow,
                updated_at = DateTimeOffset.UtcNow
            };

            await _accountRepository.AddAsync(account);

            var user = new User
            {
                account_id = account.account_id,
                username = new UserName(username),
                full_name = fullName,
                date_of_birth = dateOfBirth,
                gender = Enum.Parse<Gender>(gender)
            };

            // TODO: Add user using UserRepository

            return true;
        }

        // Implement từ ITokenService
        public async Task<(string AccessToken, string RefreshToken)> GenerateTokensAsync(Account account)
        {
            var accessToken = _jwtService.GenerateAccessToken(account);
            var refreshToken = _jwtService.GenerateRefreshToken(account);
            return await Task.FromResult((accessToken, refreshToken));  // Wrap sync call vào Task
        }

        // Sửa để khớp interface: Giữ async Task<string>, wrap logic sync vào Task.FromResult để tránh warning CS1998
        public async Task<string> GenerateOtpAsync()
        {
            var random = new Random();
            var otp = random.Next(100000, 999999).ToString();
            return await Task.FromResult(otp);
        }

        public async Task<(string AccessToken, string RefreshToken)?> RefreshTokenAsync(string refreshTokenValue)
        {
            var refreshToken = await _refreshTokenRepository.GetByTokenAsync(refreshTokenValue);
            if (refreshToken == null || refreshToken.expires_at <= DateTimeOffset.UtcNow)
            {
                return null;
            }

            var account = await _accountRepository.GetByIdAsync(refreshToken.account_id);
            if (account == null || account.status != "active")
            {
                return null;
            }

            // Xóa refresh token cũ
            await _refreshTokenRepository.DeleteAsync(refreshToken.token_id);

            // Tạo token mới
            var accessToken = _jwtService.GenerateAccessToken(account);
            var newRefreshTokenValue = _jwtService.GenerateRefreshToken(account);

            // Lưu refresh token mới
            var newRefreshToken = new RefreshToken
            {
                account_id = account.account_id,
                refresh_token = newRefreshTokenValue,
                expires_at = DateTimeOffset.UtcNow.AddDays(30),
                created_at = DateTimeOffset.UtcNow
            };
            await _refreshTokenRepository.AddAsync(newRefreshToken);

            return (accessToken, newRefreshTokenValue);
        }

        public async Task<bool> LogoutAsync(string refreshTokenValue)
        {
            var refreshToken = await _refreshTokenRepository.GetByTokenAsync(refreshTokenValue);
            if (refreshToken != null)
            {
                await _refreshTokenRepository.DeleteAsync(refreshToken.token_id);
                return true;
            }
            return false;
        }

        public ClaimsPrincipal? ValidateToken(string token)
        {
            return _jwtService.ValidateToken(token);
        }
    }
}
