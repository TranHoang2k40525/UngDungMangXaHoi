using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Application.Validators;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Services;
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
        private readonly AuthService _authService;
        private readonly IEmailService _emailService;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly ILoginHistoryRepository _loginHistoryRepository;

        public AuthController(
            IAccountRepository accountRepository,
            IUserRepository userRepository,
            IOTPRepository otpRepository,
            IPasswordHasher passwordHasher,
            AuthService authService,
            IEmailService emailService,
            IRefreshTokenRepository refreshTokenRepository,
            ILoginHistoryRepository loginHistoryRepository)
        {
            _accountRepository = accountRepository;
            _userRepository = userRepository;
            _otpRepository = otpRepository;
            _passwordHasher = passwordHasher;
            _authService = authService;
            _emailService = emailService;
            _refreshTokenRepository = refreshTokenRepository;
            _loginHistoryRepository = loginHistoryRepository;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterUserRequest request)
        {
            Console.WriteLine($"Nhận được JSON: {System.Text.Json.JsonSerializer.Serialize(request)}");

            var validator = new UserValidator();
            var validationResult = await validator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                return BadRequest(new { message = "Dữ liệu không hợp lệ", errors = validationResult.Errors });
            }

            if (await _accountRepository.ExistsByEmailAsync(new Email(request.Email)))
            {
                return BadRequest(new { message = "Email đã tồn tại." });
            }

            if (await _accountRepository.ExistsByPhoneAsync(request.Phone))
            {
                return BadRequest(new { message = "Số điện thoại đã tồn tại." });
            }

            if (await _userRepository.ExistsByUserNameAsync(new UserName(request.Username)))
            {
                return BadRequest(new { message = "Tên người dùng đã tồn tại." });
            }

            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(0, "register");
            if (failedAttempts >= 5)
            {
                return StatusCode(429, new { message = "Quá nhiều lần thử. Vui lòng thử lại sau 2 phút." });
            }

            var account = new Account
            {
                email = new Email(request.Email),
                phone = new PhoneNumber(request.Phone),
                password_hash = new PasswordHash(_passwordHasher.HashPassword(request.Password)),
                account_type = AccountType.User,
                status = "pending",
                created_at = DateTimeOffset.UtcNow,
                updated_at = DateTimeOffset.UtcNow
            };

            var addedAccount = await _accountRepository.AddAsync(account);

            var user = new User
            {
                account_id = addedAccount.account_id,
                username = new UserName(request.Username),
                full_name = request.FullName,
                date_of_birth = new DateTimeOffset(request.DateOfBirth, TimeSpan.Zero),
                gender = request.Gender,
                Account = account
            };

            await _userRepository.AddAsync(user);

            var otp = await _authService.GenerateOtpAsync();
            var otpHash = _passwordHasher.HashPassword(otp);
            var otpEntity = new OTP
            {
                account_id = account.account_id,
                otp_hash = otpHash,
                purpose = "register",
                expires_at = DateTimeOffset.UtcNow.AddMinutes(1),
                used = false,
                created_at = DateTimeOffset.UtcNow
            };

            await _otpRepository.AddAsync(otpEntity);
            await _emailService.SendOtpEmailAsync(request.Email, otp, "register", request.FullName);

            return Ok(new { message = "OTP đã được gửi đến email. Vui lòng xác thực trong vòng 1 phút." });
        }

        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            var account = await _accountRepository.GetByEmailAsync(new Email(request.Email));
            if (account == null || account.status != "pending")
            {
                return BadRequest(new { message = "Tài khoản không hợp lệ hoặc đã được xác thực." });
            }

            var otp = await _otpRepository.GetByAccountIdAsync(account.account_id, "register");
            if (otp == null || otp.expires_at < DateTimeOffset.UtcNow)
            {
                return BadRequest(new { message = "OTP đã hết hạn hoặc không hợp lệ." });
            }

            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(account.account_id, "register");
            if (failedAttempts >= 5)
            {
                await _otpRepository.DeleteAsync(otp.otp_id);
                return StatusCode(429, new { message = "Quá nhiều lần thử thất bại. Vui lòng đăng ký lại sau 2 phút." });
            }

            if (!_passwordHasher.VerifyPassword(request.Otp, otp.otp_hash))
            {
                await _otpRepository.UpdateAsync(otp);
                return BadRequest(new { message = "OTP không hợp lệ." });
            }

            account.status = "active";
            otp.used = true;
            await _accountRepository.UpdateAsync(account);
            await _otpRepository.UpdateAsync(otp);

            var (accessToken, refreshToken) = await _authService.GenerateTokensAsync(account);
            return Ok(new { AccessToken = accessToken, RefreshToken = refreshToken });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var account = await _accountRepository.GetByEmailAsync(new Email(request.Email)) ??
                          await _accountRepository.GetByPhoneAsync(request.Phone);
            if (account == null || account.status != "active")
            {
                return Unauthorized(new { message = "Thông tin đăng nhập không hợp lệ hoặc tài khoản chưa được kích hoạt." });
            }

            if (!_passwordHasher.VerifyPassword(request.Password, account.password_hash.Value))
            {
                return Unauthorized(new { message = "Thông tin đăng nhập không hợp lệ." });
            }

            // Lấy IP address và device info
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "";
            var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

            var (accessToken, refreshToken) = await _authService.DangNhapAsync(
                request.Email ?? request.Phone, 
                request.Password, 
                account.account_type.ToString(), 
                ipAddress, 
                userAgent);
            
            return Ok(new { AccessToken = accessToken, RefreshToken = refreshToken });
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            var result = await _authService.RefreshTokenAsync(request.RefreshToken);
            if (result == null)
            {
                return Unauthorized(new { message = "Refresh token không hợp lệ hoặc đã hết hạn." });
            }

            return Ok(new { AccessToken = result.Value.AccessToken, RefreshToken = result.Value.RefreshToken });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request)
        {
            var success = await _authService.LogoutAsync(request.RefreshToken);
            if (!success)
            {
                return BadRequest(new { message = "Refresh token không hợp lệ." });
            }

            return Ok(new { message = "Đăng xuất thành công." });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            Console.WriteLine($"[FORGOT-PASSWORD] Received request for email: {request.Email}");

            var account = await _accountRepository.GetByEmailAsync(new Email(request.Email));
            if (account == null || account.status != "active")
            {
                Console.WriteLine($"[FORGOT-PASSWORD] Account not found or inactive");
                return BadRequest(new { message = "Email không tồn tại hoặc tài khoản chưa được kích hoạt." });
            }

            Console.WriteLine($"[FORGOT-PASSWORD] Account found: {account.account_id}");

            // Kiểm tra số lần thử trong 2 phút
            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(account.account_id, "forgot_password");
            Console.WriteLine($"[FORGOT-PASSWORD] Failed attempts: {failedAttempts}");
            
            if (failedAttempts >= 5)
            {
                return StatusCode(429, new { message = "Quá nhiều lần thử. Vui lòng thử lại sau 2 phút." });
            }

            // Lấy tên người dùng
            string fullName = "";
            if (account.account_type == AccountType.User && account.User != null)
            {
                fullName = account.User.full_name;
            }
            else if (account.account_type == AccountType.Admin && account.Admin != null)
            {
                fullName = account.Admin.full_name;
            }

            Console.WriteLine($"[FORGOT-PASSWORD] Full name: {fullName}");

            // Tạo OTP mới
            var otp = await _authService.GenerateOtpAsync();
            var otpHash = _passwordHasher.HashPassword(otp);
            var otpEntity = new OTP
            {
                account_id = account.account_id,
                otp_hash = otpHash,
                purpose = "forgot_password",
                expires_at = DateTimeOffset.UtcNow.AddMinutes(1),
                used = false,
                created_at = DateTimeOffset.UtcNow
            };

            await _otpRepository.AddAsync(otpEntity);
            Console.WriteLine($"[FORGOT-PASSWORD] OTP created and saved");

            await _emailService.SendOtpEmailAsync(request.Email, otp, "forgot_password", fullName);
            Console.WriteLine($"[FORGOT-PASSWORD] Email sent successfully");

            return Ok(new { message = "OTP đã được gửi đến email. Vui lòng xác thực trong vòng 1 phút." });
        }

        [HttpPost("verify-forgot-password-otp")]
        public async Task<IActionResult> VerifyForgotPasswordOtp([FromBody] VerifyOtpRequest request)
        {
            var account = await _accountRepository.GetByEmailAsync(new Email(request.Email));
            if (account == null || account.status != "active")
            {
                return BadRequest(new { message = "Tài khoản không hợp lệ hoặc chưa được kích hoạt." });
            }

            var otp = await _otpRepository.GetByAccountIdAsync(account.account_id, "forgot_password");
            if (otp == null || otp.expires_at < DateTimeOffset.UtcNow)
            {
                return BadRequest(new { message = "OTP đã hết hạn hoặc không hợp lệ." });
            }

            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(account.account_id, "forgot_password");
            if (failedAttempts >= 5)
            {
                await _otpRepository.DeleteAsync(otp.otp_id);
                return StatusCode(429, new { message = "Quá nhiều lần thử thất bại. Vui lòng thử lại sau 2 phút." });
            }

            if (!_passwordHasher.VerifyPassword(request.Otp, otp.otp_hash))
            {
                await _otpRepository.UpdateAsync(otp);
                return BadRequest(new { message = "OTP không hợp lệ." });
            }

            // Đánh dấu OTP đã sử dụng và gia hạn thêm 5 phút
            otp.used = true;
            otp.expires_at = DateTimeOffset.UtcNow.AddMinutes(5);
            await _otpRepository.UpdateAsync(otp);

            return Ok(new { message = "Xác thực OTP thành công. Bạn có thể đặt lại mật khẩu." });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var account = await _accountRepository.GetByEmailAsync(new Email(request.Email));
            if (account == null || account.status != "active")
            {
                return BadRequest(new { message = "Tài khoản không hợp lệ hoặc chưa được kích hoạt." });
            }

            // Kiểm tra OTP đã được verify chưa
            var otp = await _otpRepository.GetByAccountIdAsync(account.account_id, "forgot_password");
            if (otp == null || !otp.used || otp.expires_at < DateTimeOffset.UtcNow)
            {
                return BadRequest(new { message = "Vui lòng xác thực OTP trước." });
            }

            // Cập nhật mật khẩu mới
            account.password_hash = new PasswordHash(_passwordHasher.HashPassword(request.NewPassword));
            account.updated_at = DateTimeOffset.UtcNow;
            await _accountRepository.UpdateAsync(account);

            // Xóa tất cả refresh token của account để tránh refresh bằng token cũ sau khi đổi mật khẩu
            await _refreshTokenRepository.DeleteByAccountIdAsync(account.account_id);

            // Xóa OTP đã sử dụng
            await _otpRepository.DeleteAsync(otp.otp_id);

            return Ok(new { message = "Đặt lại mật khẩu thành công." });
        }

        // ⭐ ENDPOINT MỚI: Verify OTP và Reset Password trong 1 lần
        [HttpPost("reset-password-with-otp")]
        public async Task<IActionResult> ResetPasswordWithOtp([FromBody] ResetPasswordWithOtpRequest request)
        {
            Console.WriteLine($"[RESET-PASSWORD-WITH-OTP] Received request for email: {request.Email}");

            var account = await _accountRepository.GetByEmailAsync(new Email(request.Email));
            if (account == null || account.status != "active")
            {
                Console.WriteLine($"[RESET-PASSWORD-WITH-OTP] Account not found or inactive");
                return BadRequest(new { message = "Tài khoản không hợp lệ hoặc chưa được kích hoạt." });
            }

            Console.WriteLine($"[RESET-PASSWORD-WITH-OTP] Account found: {account.account_id}");

            // Lấy OTP
            var otp = await _otpRepository.GetByAccountIdAsync(account.account_id, "forgot_password");
            if (otp == null || otp.expires_at < DateTimeOffset.UtcNow)
            {
                Console.WriteLine($"[RESET-PASSWORD-WITH-OTP] OTP expired or not found");
                return BadRequest(new { message = "OTP đã hết hạn hoặc không hợp lệ." });
            }

            Console.WriteLine($"[RESET-PASSWORD-WITH-OTP] OTP found, checking failed attempts");

            // Kiểm tra số lần thử
            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(account.account_id, "forgot_password");
            Console.WriteLine($"[RESET-PASSWORD-WITH-OTP] Failed attempts: {failedAttempts}");
            
            if (failedAttempts >= 5)
            {
                await _otpRepository.DeleteAsync(otp.otp_id);
                return StatusCode(429, new { message = "Quá nhiều lần thử thất bại. Vui lòng thử lại sau 2 phút." });
            }

            Console.WriteLine($"[RESET-PASSWORD-WITH-OTP] Verifying OTP");

            // Xác thực OTP
            if (!_passwordHasher.VerifyPassword(request.Otp, otp.otp_hash))
            {
                Console.WriteLine($"[RESET-PASSWORD-WITH-OTP] OTP verification failed");
                await _otpRepository.UpdateAsync(otp);
                return BadRequest(new { message = "Mã OTP không đúng." });
            }

            Console.WriteLine($"[RESET-PASSWORD-WITH-OTP] OTP verified, updating password");

            // Cập nhật mật khẩu mới
            account.password_hash = new PasswordHash(_passwordHasher.HashPassword(request.NewPassword));
            account.updated_at = DateTimeOffset.UtcNow;
            await _accountRepository.UpdateAsync(account);

            Console.WriteLine($"[RESET-PASSWORD-WITH-OTP] Password updated");

            // Xóa tất cả refresh token của account để tránh refresh bằng token cũ sau khi đổi mật khẩu
            await _refreshTokenRepository.DeleteByAccountIdAsync(account.account_id);

            // Xóa OTP đã sử dụng
            await _otpRepository.DeleteAsync(otp.otp_id);

            Console.WriteLine($"[RESET-PASSWORD-WITH-OTP] Success");

            return Ok(new { message = "Đặt lại mật khẩu thành công." });
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            // Middleware đã xác thực token và gán vào HttpContext.User rồi
            // Chỉ cần lấy accountId từ claims
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                Console.WriteLine("[CHANGE-PASSWORD] ERROR: Cannot extract account ID from token");
                return Unauthorized(new { message = "Token không chứa thông tin tài khoản." });
            }
            
            Console.WriteLine($"[CHANGE-PASSWORD] User from middleware: AccountId={accountId}");
            
            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null || account.status != "active")
            {
                Console.WriteLine($"[CHANGE-PASSWORD] Account not found or inactive. AccountId: {accountId}");
                return BadRequest(new { message = "Không tìm thấy tài khoản hoặc tài khoản chưa được kích hoạt." });
            }

            Console.WriteLine($"[CHANGE-PASSWORD] Account found: {account.email?.Value}, Status: {account.status}");
            Console.WriteLine($"[CHANGE-PASSWORD] Verifying old password...");

            // Xác thực mật khẩu cũ
            if (!_passwordHasher.VerifyPassword(request.OldPassword, account.password_hash.Value))
            {
                Console.WriteLine("[CHANGE-PASSWORD] Old password verification FAILED");
                return BadRequest(new { message = "Mật khẩu hiện tại không đúng." });
            }

            Console.WriteLine("[CHANGE-PASSWORD] Old password verified successfully");

            // Kiểm tra số lần thử trong 2 phút
            Console.WriteLine($"[CHANGE-PASSWORD] Checking failed attempts for account {account.account_id}...");
            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(account.account_id, "change_password");
            Console.WriteLine($"[CHANGE-PASSWORD] Failed attempts: {failedAttempts}");
            
            if (failedAttempts >= 5)
            {
                Console.WriteLine("[CHANGE-PASSWORD] Too many attempts, returning 429");
                return StatusCode(429, new { message = "Quá nhiều lần thử. Vui lòng thử lại sau 2 phút." });
            }

            // Lấy tên người dùng
            string fullName = "";
            if (account.account_type == AccountType.User && account.User != null)
            {
                fullName = account.User.full_name;
            }
            else if (account.account_type == AccountType.Admin && account.Admin != null)
            {
                fullName = account.Admin.full_name;
            }

            Console.WriteLine($"[CHANGE-PASSWORD] Full name: {fullName}");
            Console.WriteLine("[CHANGE-PASSWORD] Generating OTP...");

            // Tạo OTP mới
            var otp = await _authService.GenerateOtpAsync();
            var otpHash = _passwordHasher.HashPassword(otp);
            var otpEntity = new OTP
            {
                account_id = account.account_id,
                otp_hash = otpHash,
                purpose = "change_password",
                expires_at = DateTimeOffset.UtcNow.AddMinutes(1),
                used = false,
                created_at = DateTimeOffset.UtcNow
            };

            Console.WriteLine("[CHANGE-PASSWORD] Saving OTP to database...");
            await _otpRepository.AddAsync(otpEntity);
            
            Console.WriteLine($"[CHANGE-PASSWORD] Sending OTP email to {account.email?.Value}...");
            await _emailService.SendOtpEmailAsync(account.email?.Value ?? "", otp, "change_password", fullName);
            
            Console.WriteLine("[CHANGE-PASSWORD] SUCCESS - OTP sent");
            return Ok(new { message = "OTP đã được gửi đến email. Vui lòng xác thực trong vòng 1 phút." });
        }

        [HttpPost("verify-change-password-otp")]
        public async Task<IActionResult> VerifyChangePasswordOtp([FromBody] VerifyChangePasswordOtpRequest request)
        {
            // Middleware đã xác thực token và gán vào HttpContext.User rồi
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                return Unauthorized(new { message = "Token không chứa thông tin tài khoản." });
            }

            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null || account.status != "active")
            {
                return BadRequest(new { message = "Không tìm thấy tài khoản hoặc tài khoản chưa được kích hoạt." });
            }

            var otp = await _otpRepository.GetByAccountIdAsync(account.account_id, "change_password");
            if (otp == null || otp.expires_at < DateTimeOffset.UtcNow)
            {
                return BadRequest(new { message = "OTP đã hết hạn hoặc không hợp lệ." });
            }

            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(account.account_id, "change_password");
            if (failedAttempts >= 5)
            {
                await _otpRepository.DeleteAsync(otp.otp_id);
                return StatusCode(429, new { message = "Quá nhiều lần thử thất bại. Vui lòng thử lại sau 2 phút." });
            }

            if (!_passwordHasher.VerifyPassword(request.Otp, otp.otp_hash))
            {
                await _otpRepository.UpdateAsync(otp);
                return BadRequest(new { message = "OTP không hợp lệ." });
            }

            // Cập nhật mật khẩu mới
            account.password_hash = new PasswordHash(_passwordHasher.HashPassword(request.NewPassword));
            account.updated_at = DateTimeOffset.UtcNow;
            await _accountRepository.UpdateAsync(account);

            // Xóa tất cả refresh token của account → bắt buộc đăng nhập lại với mật khẩu mới
            await _refreshTokenRepository.DeleteByAccountIdAsync(account.account_id);

            // Xóa OTP đã sử dụng
            await _otpRepository.DeleteAsync(otp.otp_id);

            return Ok(new { message = "Đổi mật khẩu thành công." });
        }
    }

    // DTOs moved to Application.DTOs.AuthDto
}
