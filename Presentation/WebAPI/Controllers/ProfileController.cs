using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Services;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    /// <summary>
    /// Controller xử lý các thao tác liên quan đến User Profile
    /// (Tương tự authController trong Node.js, nhưng tách riêng profile logic)
    /// </summary>
    [ApiController]
    [Route("api/users/profile")]
    [Authorize] // Tất cả endpoints đều yêu cầu authentication
    public class ProfileController : ControllerBase
    {
        private readonly UserProfileService _profileService;

        public ProfileController(UserProfileService profileService)
        {
            _profileService = profileService;
        }

        /// <summary>
        /// GET /api/users/profile - Lấy thông tin profile đầy đủ của user đang đăng nhập
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                {
                    return Unauthorized(new { message = "Token không hợp lệ!" });
                }

                var userId = int.Parse(userIdClaim.Value);
                var profile = await _profileService.GetProfileAsync(userId);

                if (profile == null)
                {
                    return NotFound(new { message = "Không tìm thấy profile!" });
                }

                return Ok(new
                {
                    message = "Lấy thông tin profile thành công!",
                    data = profile
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PROFILE] GET ERROR: {ex.Message}");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi lấy profile!", error = ex.Message });
            }
        }

        /// <summary>
        /// PUT /api/users/profile - Cập nhật thông tin cơ bản (không cần OTP)
        /// Body: { fullName, gender, bio, isPrivate, dateOfBirth, address, hometown, job, website }
        /// </summary>
        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                {
                    return Unauthorized(new { message = "Token không hợp lệ!" });
                }

                var userId = int.Parse(userIdClaim.Value);
                var success = await _profileService.UpdateBasicInfoAsync(userId, request);

                if (!success)
                {
                    return NotFound(new { message = "User không tồn tại!" });
                }

                return Ok(new { message = "Cập nhật profile thành công!" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PROFILE] UPDATE ERROR: {ex.Message}");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi cập nhật profile!", error = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/users/profile/change-email/request - Gửi OTP để đổi email
        /// Body: { newEmail }
        /// </summary>
        [HttpPost("change-email/request")]
        public async Task<IActionResult> RequestChangeEmail([FromBody] RequestChangeEmailDto request)
        {
            try
            {
                var accountIdClaim = User.FindFirst("AccountId");
                if (accountIdClaim == null)
                {
                    return Unauthorized(new { message = "Token không hợp lệ!" });
                }

                var accountId = int.Parse(accountIdClaim.Value);
                var (success, message) = await _profileService.RequestChangeEmailAsync(accountId, request.NewEmail);

                if (!success)
                {
                    return BadRequest(new { message });
                }

                return Ok(new { message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PROFILE] REQUEST CHANGE EMAIL ERROR: {ex.Message}");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi gửi OTP!", error = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/users/profile/change-email/verify - Verify OTP và đổi email
        /// Body: { newEmail, otp }
        /// </summary>
        [HttpPost("change-email/verify")]
        public async Task<IActionResult> VerifyChangeEmail([FromBody] VerifyChangeEmailDto request)
        {
            try
            {
                var accountIdClaim = User.FindFirst("AccountId");
                if (accountIdClaim == null)
                {
                    return Unauthorized(new { message = "Token không hợp lệ!" });
                }

                var accountId = int.Parse(accountIdClaim.Value);
                var (success, message) = await _profileService.VerifyChangeEmailAsync(accountId, request.NewEmail, request.Otp);

                if (!success)
                {
                    return BadRequest(new { message });
                }

                return Ok(new { message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PROFILE] VERIFY CHANGE EMAIL ERROR: {ex.Message}");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi verify OTP!", error = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/users/profile/change-phone/request - Gửi OTP để đổi SĐT
        /// Body: { newPhone }
        /// </summary>
        [HttpPost("change-phone/request")]
        public async Task<IActionResult> RequestChangePhone([FromBody] RequestChangePhoneDto request)
        {
            try
            {
                var accountIdClaim = User.FindFirst("AccountId");
                if (accountIdClaim == null)
                {
                    return Unauthorized(new { message = "Token không hợp lệ!" });
                }

                var accountId = int.Parse(accountIdClaim.Value);
                var (success, message) = await _profileService.RequestChangePhoneAsync(accountId, request.NewPhone);

                if (!success)
                {
                    return BadRequest(new { message });
                }

                return Ok(new { message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PROFILE] REQUEST CHANGE PHONE ERROR: {ex.Message}");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi gửi OTP!", error = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/users/profile/change-phone/verify - Verify OTP và đổi SĐT
        /// Body: { newPhone, otp }
        /// </summary>
        [HttpPost("change-phone/verify")]
        public async Task<IActionResult> VerifyChangePhone([FromBody] VerifyChangePhoneDto request)
        {
            try
            {
                var accountIdClaim = User.FindFirst("AccountId");
                if (accountIdClaim == null)
                {
                    return Unauthorized(new { message = "Token không hợp lệ!" });
                }

                var accountId = int.Parse(accountIdClaim.Value);
                var (success, message) = await _profileService.VerifyChangePhoneAsync(accountId, request.NewPhone, request.Otp);

                if (!success)
                {
                    return BadRequest(new { message });
                }

                return Ok(new { message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PROFILE] VERIFY CHANGE PHONE ERROR: {ex.Message}");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi verify OTP!", error = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/users/profile/avatar - Upload avatar và option đăng bài
        /// Form-data: 
        ///   - avatarFile: file ảnh
        ///   - createPost: true/false
        ///   - postCaption: string (optional)
        ///   - postLocation: string (optional)
        ///   - postPrivacy: "Public"/"Friends"/"Private" (optional)
        /// </summary>
        [HttpPost("avatar")]
        public async Task<IActionResult> UpdateAvatar([FromForm] IFormFile avatarFile, [FromForm] UpdateAvatarRequest request)
        {
            try
            {
                if (avatarFile == null || avatarFile.Length == 0)
                {
                    return BadRequest(new { message = "Vui lòng chọn file ảnh!" });
                }

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                {
                    return Unauthorized(new { message = "Token không hợp lệ!" });
                }

                var userId = int.Parse(userIdClaim.Value);
                var (success, message, avatarUrl) = await _profileService.UpdateAvatarAsync(userId, avatarFile, request);

                if (!success)
                {
                    return BadRequest(new { message });
                }

                return Ok(new
                {
                    message,
                    data = new { avatarUrl }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PROFILE] UPDATE AVATAR ERROR: {ex.Message}");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi upload avatar!", error = ex.Message });
            }
        }

        /// <summary>
        /// DELETE /api/users/profile/avatar - Gỡ avatar (xóa ảnh đại diện)
        /// </summary>
        [HttpDelete("avatar")]
        public async Task<IActionResult> RemoveAvatar()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                {
                    return Unauthorized(new { message = "Token không hợp lệ!" });
                }

                var userId = int.Parse(userIdClaim.Value);
                var (success, message) = await _profileService.RemoveAvatarAsync(userId);

                if (!success)
                {
                    return BadRequest(new { message });
                }

                return Ok(new { message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PROFILE] REMOVE AVATAR ERROR: {ex.Message}");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi gỡ avatar!", error = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/users/profile/avatar/{userId} - Lấy ảnh avatar của user (serve static)
        /// </summary>
        [HttpGet("avatar/{userId}")]
        [AllowAnonymous] // Cho phép anonymous để xem avatar công khai
        public IActionResult GetAvatar(int userId)
        {
            try
            {
                var avatarPath = _profileService.GetAvatarPath(userId);
                if (avatarPath == null)
                {
                    return NotFound(new { message = "Không tìm thấy avatar!" });
                }

                var image = System.IO.File.OpenRead(avatarPath);
                return File(image, "image/jpeg");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PROFILE] GET AVATAR ERROR: {ex.Message}");
                return NotFound(new { message = "Không tìm thấy avatar!", error = ex.Message });
            }
        }
    }
}
