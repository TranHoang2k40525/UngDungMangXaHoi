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
        private readonly RbacJwtTokenService _rbacJwtService; // Use RBAC JWT Service
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly ILoginHistoryRepository _loginHistoryRepository;
        private readonly IAccountRoleRepository _accountRoleRepository;
        private readonly IRoleRepository _roleRepository;

        public AuthService(
            IAccountRepository accountRepository,
            IPasswordHasher passwordHasher,
            RbacJwtTokenService rbacJwtService,
            IRefreshTokenRepository refreshTokenRepository,
            ILoginHistoryRepository loginHistoryRepository,
            IAccountRoleRepository accountRoleRepository,
            IRoleRepository roleRepository)
        {
            _accountRepository = accountRepository;
            _passwordHasher = passwordHasher;
            _rbacJwtService = rbacJwtService;
            _refreshTokenRepository = refreshTokenRepository;
            _loginHistoryRepository = loginHistoryRepository;
            _accountRoleRepository = accountRoleRepository;
            _roleRepository = roleRepository;
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

            if (account == null)
                throw new UnauthorizedAccessException("Thông tin đăng nhập không chính xác");

            // RBAC: Check if user has the required role
            bool hasRequiredRole = accountType.ToLower() == "user" 
                || await _accountRoleRepository.HasRoleAsync(account.account_id, accountType);
            
            if (!hasRequiredRole)
                throw new UnauthorizedAccessException("Tài khoản không có quyền truy cập");

            if (!_passwordHasher.VerifyPassword(password, account.password_hash.Value))
                throw new UnauthorizedAccessException("Mật khẩu không chính xác");

            // Xóa refresh token cũ nếu có
            await _refreshTokenRepository.DeleteByAccountIdAsync(account.account_id);

            // Generate tokens using RBAC JWT Service
            var accessToken = await _rbacJwtService.GenerateAccessTokenAsync(account);
            var refreshTokenValue = await _rbacJwtService.GenerateRefreshTokenAsync(account);

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
                status = "active",
                created_at = DateTimeOffset.UtcNow,
                updated_at = DateTimeOffset.UtcNow
            };

            await _accountRepository.AddAsync(account);

            // RBAC: Assign default "User" role
            var userRole = await _roleRepository.GetByNameAsync("User");
            if (userRole != null)
            {
                await _accountRoleRepository.AssignRoleAsync(
                    account.account_id,
                    userRole.role_id,
                    expiresAt: null,
                    assignedBy: "SYSTEM"
                );
            }

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
            var accessToken = await _rbacJwtService.GenerateAccessTokenAsync(account);
            var refreshTokenValue = await _rbacJwtService.GenerateRefreshTokenAsync(account);

            // Lưu refresh token vào database để các lần gọi refresh tiếp theo hợp lệ
            var refreshToken = new RefreshToken
            {
                account_id = account.account_id,
                refresh_token = refreshTokenValue,
                expires_at = DateTimeOffset.UtcNow.AddDays(30),
                created_at = DateTimeOffset.UtcNow
            };
            await _refreshTokenRepository.AddAsync(refreshToken);

            return await Task.FromResult((accessToken, refreshTokenValue));  // Wrap sync call vào Task
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
            var accessToken = await _rbacJwtService.GenerateAccessTokenAsync(account);
            var newRefreshTokenValue = await _rbacJwtService.GenerateRefreshTokenAsync(account);

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
            return _rbacJwtService.ValidateToken(token);
        }
    }
}
