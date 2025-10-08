using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Application.Validators;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Infrastructure.Services;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAccountRepository _accountRepository;
        private readonly IUserRepository _userRepository;
        private readonly IOTPRepository _otpRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly ITokenService _tokenService;
        private readonly IEmailService _emailService;

        public AuthController(
            IAccountRepository accountRepository,
            IUserRepository userRepository,
            IOTPRepository otpRepository,
            IPasswordHasher passwordHasher,
            ITokenService tokenService,
            IEmailService emailService)
        {
            _accountRepository = accountRepository;
            _userRepository = userRepository;
            _otpRepository = otpRepository;
            _passwordHasher = passwordHasher;
            _tokenService = tokenService;
            _emailService = emailService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterUserRequest request)
        {
            var validator = new UserValidator();
            var validationResult = await validator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors);
            }

            if (await _accountRepository.ExistsByEmailAsync(new Email(request.Email)))
            {
                return BadRequest("Email already exists.");
            }

            if (await _accountRepository.ExistsByPhoneAsync(new PhoneNumber(request.Phone)))
            {
                return BadRequest("Phone number already exists.");
            }

            if (await _userRepository.ExistsByUserNameAsync(new UserName(request.Username)))
            {
                return BadRequest("Username already exists.");
            }

            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(0, "register");
            if (failedAttempts >= 5)
            {
                return StatusCode(429, "Too many attempts. Please try again after 2 minutes.");
            }

            var account = new Account
            {
                email = new Email(request.Email),
                phone = new PhoneNumber(request.Phone),
                password_hash = new PasswordHash(_passwordHasher.HashPassword(request.Password)),
                account_type = AccountType.User,
                status = "pending",
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow
            };

            var user = new User
            {
                username = new UserName(request.Username),
                full_name = request.FullName,
                date_of_birth = request.DateOfBirth,
                gender = request.Gender,
                Account = account
            };

            await _accountRepository.AddAsync(account);
            await _userRepository.AddAsync(user);

            var otp = await _tokenService.GenerateOtpAsync();
            var otpHash = _passwordHasher.HashPassword(otp);
            var otpEntity = new OTP
            {
                account_id = account.account_id,
                otp_hash = otpHash,
                purpose = "register",
                expires_at = DateTime.UtcNow.AddMinutes(1),
                used = false,
                created_at = DateTime.UtcNow
            };

            await _otpRepository.AddAsync(otpEntity);
            await _emailService.SendOtpEmailAsync(request.Email, otp);

            return Ok(new { message = "OTP sent to email. Please verify within 1 minute." });
        }

        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            var account = await _accountRepository.GetByEmailAsync(new Email(request.Email));
            if (account == null || account.status != "pending")
            {
                return BadRequest("Invalid account or already verified.");
            }

            var otp = await _otpRepository.GetByAccountIdAsync(account.account_id, "register");
            if (otp == null || otp.expires_at < DateTime.UtcNow)
            {
                return BadRequest("OTP expired or invalid.");
            }

            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(account.account_id, "register");
            if (failedAttempts >= 5)
            {
                await _otpRepository.DeleteAsync(otp.otp_id);
                return StatusCode(429, "Too many failed attempts. Please try registering again after 2 minutes.");
            }

            if (!_passwordHasher.VerifyPassword(request.Otp, otp.otp_hash))
            {
                await _otpRepository.UpdateAsync(otp); // Increment attempt count in DB if needed
                return BadRequest("Invalid OTP.");
            }

            account.status = "active";
            otp.used = true;
            await _accountRepository.UpdateAsync(account);
            await _otpRepository.UpdateAsync(otp);

            var (accessToken, refreshToken) = await _tokenService.GenerateTokensAsync(account);
            return Ok(new { AccessToken = accessToken, RefreshToken = refreshToken });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var account = await _accountRepository.GetByEmailAsync(new Email(request.Email)) ??
                          await _accountRepository.GetByPhoneAsync(new PhoneNumber(request.Phone));
            if (account == null || account.status != "active")
            {
                return Unauthorized("Invalid credentials or account not active.");
            }

            if (!_passwordHasher.VerifyPassword(request.Password, account.password_hash.Value))
            {
                return Unauthorized("Invalid credentials.");
            }

            var (accessToken, refreshToken) = await _tokenService.GenerateTokensAsync(account);
            return Ok(new { AccessToken = accessToken, RefreshToken = refreshToken });
        }
    }

    public class VerifyOtpRequest
    {
        public string Email { get; set; }
        public string Otp { get; set; }
    }

    public class LoginRequest
    {
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Password { get; set; }
    }
}