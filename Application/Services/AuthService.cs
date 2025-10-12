using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Infrastructure.Services;
using Microsoft.Extensions.Configuration;

namespace UngDungMangXaHoi.Application.Services
{
    // Replaced implementation so AuthService implements ITokenService correctly
    public class AuthService
    {
        private readonly IAccountRepository _accountRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly JwtTokenService _jwtService;

        public AuthService(
            IAccountRepository accountRepository,
            IPasswordHasher passwordHasher,
            JwtTokenService jwtService)
        {
            _accountRepository = accountRepository;
            _passwordHasher = passwordHasher;
            _jwtService = jwtService;
        }

        public async Task<(string AccessToken, string RefreshToken)> DangNhapAsync(string emailOrPhone, string password, string accountType)
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
                var phone = new PhoneNumber(emailOrPhone);
                account = await _accountRepository.GetByPhoneAsync(phone);
            }

            if (account == null || account.account_type.ToString() != accountType)
                throw new UnauthorizedAccessException("Thông tin đăng nhập không chính xác");

            if (!_passwordHasher.VerifyPassword(password, account.password_hash.Value))
                throw new UnauthorizedAccessException("Mật khẩu không chính xác");

            var accessToken = _jwtService.GenerateAccessToken(account);
            var refreshToken = _jwtService.GenerateRefreshToken(account);

            return (accessToken, refreshToken);
        }

        public async Task<bool> DangKyNguoiDungAsync(string username, string fullName, 
            DateTime dateOfBirth, string email, string phone, string password, string gender)
        {
            // Kiểm tra email đã tồn tại
            var emailObj = new Email(email);
            if (await _accountRepository.ExistsByEmailAsync(emailObj))
                throw new InvalidOperationException("Email đã được sử dụng");

            // Kiểm tra số điện thoại đã tồn tại
            var phoneObj = new PhoneNumber(phone);
            if (await _accountRepository.ExistsByPhoneAsync(phoneObj))
                throw new InvalidOperationException("Số điện thoại đã được sử dụng");

            var passwordHash = _passwordHasher.HashPassword(password);

            var account = new Account
            {
                email = emailObj,
                phone = phoneObj,
                password_hash = new PasswordHash(passwordHash),
                account_type = AccountType.User,
                status = "active",
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow
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

        public async Task<string> GenerateOtpAsync()
        {
            var random = new Random();
            var otp = random.Next(100000, 999999).ToString();
            return otp;
        }
    }
}

