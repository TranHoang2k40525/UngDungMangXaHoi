using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Application.Services
{
    /// <summary>
    /// Service xử lý logic cho User Profile (tương tự authController trong Node.js)
    /// </summary>
    public class UserProfileService
    {
        private readonly IUserRepository _userRepository;
        private readonly IAccountRepository _accountRepository;
        private readonly IOTPRepository _otpRepository;
        private readonly IPostRepository _postRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IEmailService _emailService;

        public UserProfileService(
            IUserRepository userRepository,
            IAccountRepository accountRepository,
            IOTPRepository otpRepository,
            IPostRepository postRepository,
            IPasswordHasher passwordHasher,
            IEmailService emailService)
        {
            _userRepository = userRepository;
            _accountRepository = accountRepository;
            _otpRepository = otpRepository;
            _postRepository = postRepository;
            _passwordHasher = passwordHasher;
            _emailService = emailService;
        }

        /// <summary>
        /// Lấy thông tin profile đầy đủ của user
        /// </summary>
        public async Task<UserProfileDto?> GetProfileAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return null;

            var account = await _accountRepository.GetByIdAsync(user.account_id);
            if (account == null) return null;
            // Aggregated counters
            var postCount = await _postRepository.GetUserPostCountAsync(user.user_id);
            var followerCount = await _userRepository.GetFollowersCountAsync(user.user_id);
            var followingCount = await _userRepository.GetFollowingCountAsync(user.user_id);

            return new UserProfileDto
            {
                UserId = user.user_id,
                Username = user.username.Value,
                AccountId = user.account_id,
                Email = account.email?.Value ?? "",
                Phone = account.phone?.Value,
                FullName = user.full_name,
                Gender = user.gender.ToString(),
                Bio = user.bio,
                AvatarUrl = user.avatar_url?.Value,
                IsPrivate = user.is_private,
                DateOfBirth = user.date_of_birth,
                Address = user.address,
                Hometown = user.hometown,
                Job = user.job,
                Website = user.website,
                AccountStatus = account.status,
                CreatedAt = account.created_at,
                PostCount = postCount,
                FollowerCount = followerCount,
                FollowingCount = followingCount,
                AccountType = account.account_type.ToString()  // Thêm AccountType
            };
        }

        /// <summary>
        /// Lấy (và tự tạo nếu chưa có) profile theo AccountId trong token
        /// </summary>
        public async Task<UserProfileDto?> GetProfileByAccountIdAsync(int accountId)
        {
            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null) return null;

            var user = await _userRepository.GetByAccountIdAsync(accountId);
            if (user == null)
            {
                // Tự tạo user mặc định nếu chưa có bản ghi User tương ứng
                var baseName = account.email?.Value?.Split('@')?.FirstOrDefault() ?? $"user{account.account_id}";
                var safeUserName = new UserName($"{baseName}_{account.account_id}"); // đảm bảo unique

                user = new User
                {
                    account_id = account.account_id,
                    username = safeUserName,
                    full_name = baseName,
                    gender = Gender.Khác,
                    is_private = false,
                    date_of_birth = new DateTimeOffset(new DateTime(2000, 1, 1), TimeSpan.Zero),
                };
                user = await _userRepository.AddAsync(user);
            }

            return await GetProfileAsync(user.user_id);
        }

        /// <summary>
        /// Cập nhật thông tin cơ bản (không cần OTP)
        /// </summary>
        public async Task<bool> UpdateBasicInfoAsync(int userId, UpdateProfileRequest request)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return false;

            // Cập nhật các field được cung cấp
            if (request.FullName != null) user.full_name = request.FullName;
            if (request.Gender != null)
            {
                // Normalize gender string to handle Vietnamese characters
                var normalizedGender = request.Gender.Trim();
                
                // Try direct enum parse first (case-insensitive)
                if (Enum.TryParse<Gender>(normalizedGender, true, out var gender))
                {
                    user.gender = gender;
                }
                else
                {
                    // Fallback: map common variations
                    var lowerGender = normalizedGender.ToLower();
                    if (lowerGender.Contains("nam") || lowerGender == "male")
                        user.gender = Gender.Nam;
                    else if (lowerGender.Contains("nữ") || lowerGender.Contains("nu") || lowerGender == "female")
                        user.gender = Gender.Nữ;
                    else
                        user.gender = Gender.Khác;
                }
            }
            if (request.Bio != null) user.bio = request.Bio;
            if (request.IsPrivate.HasValue) user.is_private = request.IsPrivate.Value;
            if (request.DateOfBirth.HasValue) user.date_of_birth = request.DateOfBirth.Value;
            if (request.Address != null) user.address = request.Address;
            if (request.Hometown != null) user.hometown = request.Hometown;
            if (request.Job != null) user.job = request.Job;
            if (request.Website != null) user.website = request.Website;

            await _userRepository.UpdateAsync(user);
            return true;
        }

        public async Task<bool> UpdateBasicInfoByAccountIdAsync(int accountId, UpdateProfileRequest request)
        {
            var user = await _userRepository.GetByAccountIdAsync(accountId);
            if (user == null)
            {
                // Auto-provision nếu thiếu
                var account = await _accountRepository.GetByIdAsync(accountId);
                if (account == null) return false;
                var baseName = account.email?.Value?.Split('@')?.FirstOrDefault() ?? $"user{account.account_id}";
                var safeUserName = new UserName($"{baseName}_{account.account_id}");
                user = await _userRepository.AddAsync(new User
                {
                    account_id = account.account_id,
                    username = safeUserName,
                    full_name = baseName,
                    gender = Gender.Khác,
                    is_private = false,
                    date_of_birth = new DateTimeOffset(new DateTime(2000, 1, 1), TimeSpan.Zero),
                });
            }
            return await UpdateBasicInfoAsync(user.user_id, request);
        }

        /// <summary>
        /// Gửi OTP để thay đổi email
        /// </summary>
        public async Task<(bool Success, string Message)> RequestChangeEmailAsync(int accountId, string newEmail)
        {
            // Kiểm tra email mới đã tồn tại chưa
            if (await _accountRepository.ExistsByEmailAsync(new Email(newEmail)))
            {
                return (false, "Email này đã được sử dụng!");
            }

            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null)
            {
                return (false, "Tài khoản không tồn tại!");
            }

            // Kiểm tra số lần thử
            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(accountId, "change_email");
            if (failedAttempts >= 5)
            {
                return (false, "Quá nhiều lần thử. Vui lòng thử lại sau 2 phút.");
            }

            // Tạo OTP
            var otp = GenerateOtp();
            var otpHash = _passwordHasher.HashPassword(otp);
            var otpEntity = new OTP
            {
                account_id = accountId,
                otp_hash = otpHash,
                purpose = "change_email",
                expires_at = DateTimeOffset.UtcNow.AddMinutes(5),
                used = false,
                created_at = DateTimeOffset.UtcNow
            };

            await _otpRepository.AddAsync(otpEntity);

            // Gửi OTP đến email MỚI
            var user = await _userRepository.GetByAccountIdAsync(accountId);
            await _emailService.SendOtpEmailAsync(newEmail, otp, "change_email", user?.full_name ?? "");

            return (true, "OTP đã được gửi đến email mới. Vui lòng xác thực trong vòng 5 phút.");
        }

        /// <summary>
        /// Verify OTP và thay đổi email
        /// </summary>
        public async Task<(bool Success, string Message)> VerifyChangeEmailAsync(int accountId, string newEmail, string otp)
        {
            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null)
            {
                return (false, "Tài khoản không tồn tại!");
            }

            // Lấy OTP
            var otpEntity = await _otpRepository.GetByAccountIdAsync(accountId, "change_email");
            if (otpEntity == null || otpEntity.expires_at < DateTimeOffset.UtcNow)
            {
                return (false, "OTP đã hết hạn hoặc không hợp lệ!");
            }

            // Kiểm tra số lần thử
            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(accountId, "change_email");
            if (failedAttempts >= 5)
            {
                await _otpRepository.DeleteAsync(otpEntity.otp_id);
                return (false, "Quá nhiều lần thử thất bại. Vui lòng yêu cầu OTP mới.");
            }

            // Verify OTP
            if (!_passwordHasher.VerifyPassword(otp, otpEntity.otp_hash))
            {
                await _otpRepository.UpdateAsync(otpEntity);
                return (false, "OTP không đúng!");
            }

            // Kiểm tra email mới lần nữa (double check)
            if (await _accountRepository.ExistsByEmailAsync(new Email(newEmail)))
            {
                return (false, "Email này đã được sử dụng!");
            }

            // Cập nhật email
            account.email = new Email(newEmail);
            account.updated_at = DateTimeOffset.UtcNow;
            await _accountRepository.UpdateAsync(account);

            // Xóa OTP đã dùng
            await _otpRepository.DeleteAsync(otpEntity.otp_id);

            return (true, "Đổi email thành công!");
        }

        /// <summary>
        /// Gửi OTP để thay đổi SĐT
        /// </summary>
        public async Task<(bool Success, string Message)> RequestChangePhoneAsync(int accountId, string newPhone)
        {
            // Kiểm tra SĐT mới đã tồn tại chưa
            if (await _accountRepository.ExistsByPhoneAsync(newPhone))
            {
                return (false, "Số điện thoại này đã được sử dụng!");
            }

            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null)
            {
                return (false, "Tài khoản không tồn tại!");
            }

            // Kiểm tra số lần thử
            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(accountId, "change_phone");
            if (failedAttempts >= 5)
            {
                return (false, "Quá nhiều lần thử. Vui lòng thử lại sau 2 phút.");
            }

            // Tạo OTP
            var otp = GenerateOtp();
            var otpHash = _passwordHasher.HashPassword(otp);
            var otpEntity = new OTP
            {
                account_id = accountId,
                otp_hash = otpHash,
                purpose = "change_phone",
                expires_at = DateTimeOffset.UtcNow.AddMinutes(5),
                used = false,
                created_at = DateTimeOffset.UtcNow
            };

            await _otpRepository.AddAsync(otpEntity);

            // Gửi OTP đến email hiện tại (vì SĐT mới chưa verify)
            var user = await _userRepository.GetByAccountIdAsync(accountId);
            await _emailService.SendOtpEmailAsync(account.email?.Value ?? "", otp, "change_phone", user?.full_name ?? "");

            return (true, $"OTP đã được gửi đến email {account.email?.Value}. Vui lòng xác thực trong vòng 5 phút.");
        }

        /// <summary>
        /// Verify OTP và thay đổi SĐT
        /// </summary>
        public async Task<(bool Success, string Message)> VerifyChangePhoneAsync(int accountId, string newPhone, string otp)
        {
            var account = await _accountRepository.GetByIdAsync(accountId);
            if (account == null)
            {
                return (false, "Tài khoản không tồn tại!");
            }

            // Lấy OTP
            var otpEntity = await _otpRepository.GetByAccountIdAsync(accountId, "change_phone");
            if (otpEntity == null || otpEntity.expires_at < DateTimeOffset.UtcNow)
            {
                return (false, "OTP đã hết hạn hoặc không hợp lệ!");
            }

            // Kiểm tra số lần thử
            var failedAttempts = await _otpRepository.GetFailedAttemptsAsync(accountId, "change_phone");
            if (failedAttempts >= 5)
            {
                await _otpRepository.DeleteAsync(otpEntity.otp_id);
                return (false, "Quá nhiều lần thử thất bại. Vui lòng yêu cầu OTP mới.");
            }

            // Verify OTP
            if (!_passwordHasher.VerifyPassword(otp, otpEntity.otp_hash))
            {
                await _otpRepository.UpdateAsync(otpEntity);
                return (false, "OTP không đúng!");
            }

            // Kiểm tra SĐT mới lần nữa
            if (await _accountRepository.ExistsByPhoneAsync(newPhone))
            {
                return (false, "Số điện thoại này đã được sử dụng!");
            }

            // Cập nhật SĐT
            account.phone = new PhoneNumber(newPhone);
            account.updated_at = DateTimeOffset.UtcNow;
            await _accountRepository.UpdateAsync(account);

            // Xóa OTP đã dùng
            await _otpRepository.DeleteAsync(otpEntity.otp_id);

            return (true, "Đổi số điện thoại thành công!");
        }

        /// <summary>
        /// Upload avatar (lưu vào Assets/Images) và option đăng bài
        /// </summary>
        public async Task<(bool Success, string Message, string? AvatarUrl)> UpdateAvatarAsync(
            int userId,
            IFormFile avatarFile,
            UpdateAvatarRequest request)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return (false, "User không tồn tại!", null);
            }

            // Validate file
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
            var extension = Path.GetExtension(avatarFile.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
            {
                return (false, "Chỉ chấp nhận file ảnh (.jpg, .jpeg, .png, .gif)!", null);
            }

            if (avatarFile.Length > 5 * 1024 * 1024) // 5MB
            {
                return (false, "Kích thước ảnh không được vượt quá 5MB!", null);
            }

            // Tạo tên file: username_randomcode.ext
            var randomCode = Guid.NewGuid().ToString("N").Substring(0, 8);
            var fileName = $"{user.username.Value}_{randomCode}{extension}";
            var assetsPath = Path.Combine(Directory.GetCurrentDirectory(), "Assets", "Images");
            
            // Tạo thư mục nếu chưa tồn tại
            if (!Directory.Exists(assetsPath))
            {
                Directory.CreateDirectory(assetsPath);
            }

            var filePath = Path.Combine(assetsPath, fileName);

            // Lưu file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await avatarFile.CopyToAsync(stream);
            }

            // Lưu URL vào database (relative path)
            var avatarUrl = $"/Assets/Images/{fileName}";
            user.avatar_url = new ImageUrl(avatarUrl);
            await _userRepository.UpdateAsync(user);

            Console.WriteLine($"[AVATAR] Saved avatar: {avatarUrl} for user {user.username.Value}");

            // Nếu user chọn đăng bài
            if (request.CreatePost)
            {
                var post = new Post
                {
                    user_id = userId,
                    caption = request.PostCaption ?? "Đã cập nhật ảnh đại diện",
                    location = request.PostLocation,
                    privacy = request.PostPrivacy,
                    is_visible = true,
                    created_at = DateTimeOffset.UtcNow
                };

                var createdPost = await _postRepository.AddAsync(post);

                // Thêm media cho post
                var postMedia = new PostMedia
                {
                    post_id = createdPost.post_id,
                    media_url = avatarUrl,
                    media_type = "Image",
                    media_order = 0,
                    created_at = DateTimeOffset.UtcNow
                };

                await _postRepository.AddMediaAsync(postMedia);

                Console.WriteLine($"[AVATAR] Created post {createdPost.post_id} with avatar image");
                return (true, "Cập nhật avatar và đăng bài thành công!", avatarUrl);
            }

            return (true, "Cập nhật avatar thành công!", avatarUrl);
        }

        public async Task<(bool Success, string Message, string? AvatarUrl)> UpdateAvatarByAccountIdAsync(
            int accountId,
            IFormFile avatarFile,
            UpdateAvatarRequest request)
        {
            var user = await _userRepository.GetByAccountIdAsync(accountId);
            if (user == null)
            {
                // Auto-provision nếu thiếu
                var account = await _accountRepository.GetByIdAsync(accountId);
                if (account == null) return (false, "Tài khoản không tồn tại!", null);
                var baseName = account.email?.Value?.Split('@')?.FirstOrDefault() ?? $"user{account.account_id}";
                var safeUserName = new UserName($"{baseName}_{account.account_id}");
                user = await _userRepository.AddAsync(new User
                {
                    account_id = account.account_id,
                    username = safeUserName,
                    full_name = baseName,
                    gender = Gender.Khác,
                    is_private = false,
                    date_of_birth = new DateTimeOffset(new DateTime(2000, 1, 1), TimeSpan.Zero),
                });
            }
            return await UpdateAvatarAsync(user.user_id, avatarFile, request);
        }

        /// <summary>
        /// Gỡ avatar (xóa ảnh đại diện, reset về null)
        /// </summary>
        public async Task<(bool Success, string Message)> RemoveAvatarAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return (false, "User không tồn tại!");
            }

            // Lưu đường dẫn avatar cũ để xóa file
            var oldAvatarUrl = user.avatar_url?.Value;

            // Reset avatar_url về null
            user.avatar_url = null;
            await _userRepository.UpdateAsync(user);

            // Xóa file ảnh cũ nếu tồn tại
            if (!string.IsNullOrEmpty(oldAvatarUrl))
            {
                try
                {
                    var fileName = Path.GetFileName(oldAvatarUrl);
                    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Assets", "Images", fileName);
                    
                    if (File.Exists(filePath))
                    {
                        File.Delete(filePath);
                        Console.WriteLine($"[AVATAR] Deleted old avatar file: {fileName}");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[AVATAR] Failed to delete old avatar file: {ex.Message}");
                    // Không throw exception, chỉ log lỗi vì đã reset database
                }
            }

            Console.WriteLine($"[AVATAR] Removed avatar for user {user.username.Value}");
            return (true, "Gỡ avatar thành công!");
        }

        public async Task<(bool Success, string Message)> RemoveAvatarByAccountIdAsync(int accountId)
        {
            var user = await _userRepository.GetByAccountIdAsync(accountId);
            if (user == null)
            {
                // Không có user để gỡ avatar; auto-provision cũng không cần ở đây
                return (false, "User không tồn tại!");
            }
            return await RemoveAvatarAsync(user.user_id);
        }

        /// <summary>
        /// Lấy ảnh avatar (serve static file)
        /// </summary>
        public string? GetAvatarPath(int userId)
        {
            var user = _userRepository.GetByIdAsync(userId).Result;
            if (user == null || user.avatar_url == null) return null;

            var fileName = Path.GetFileName(user.avatar_url.Value);
            var assetsPath = Path.Combine(Directory.GetCurrentDirectory(), "Assets", "Images", fileName);
            
            return File.Exists(assetsPath) ? assetsPath : null;
        }

        private string GenerateOtp()
        {
            var random = new Random();
            return random.Next(100000, 999999).ToString();
        }
    }
}
