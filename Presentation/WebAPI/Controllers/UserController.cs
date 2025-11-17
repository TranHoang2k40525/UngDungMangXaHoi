using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using System.Security.Claims;
using System.Linq;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    /// <summary>
    /// UserController - User profile and follow management
    /// </summary>
    [ApiController]
    [Route("api/users")]
    [Authorize(Policy = "UserOnly")]
    public class UserController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IPostRepository _postRepository;

        public UserController(IUserRepository userRepository, IPostRepository postRepository)
        {
            _userRepository = userRepository;
            _postRepository = postRepository;
        }

        // DTO for public profile response
        public class PublicProfileDto
        {
            public int UserId { get; set; }
            public string Username { get; set; } = string.Empty;
            public string FullName { get; set; } = string.Empty;
            public string? AvatarUrl { get; set; }
            public string? Bio { get; set; }
            public string? Website { get; set; }
            public string? Address { get; set; }
            public string? Hometown { get; set; }
            public string Gender { get; set; } = string.Empty;
            public int PostsCount { get; set; }
            public int FollowersCount { get; set; }
            public int FollowingCount { get; set; }
            public bool IsFollowing { get; set; }
        }

        /// <summary>
        /// Lấy thông tin public của một user khác (by userId)
        /// GET /api/users/{userId}/profile
        /// </summary>
        [HttpGet("{userId}/profile")]
        public async Task<IActionResult> GetUserProfile(int userId)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                return Unauthorized(new { message = "Token không hợp lệ!" });
            }

            var currentUser = await _userRepository.GetByAccountIdAsync(accountId);
            if (currentUser == null)
            {
                return BadRequest(new { message = "Không tìm thấy user hiện tại." });
            }

            var targetUser = await _userRepository.GetByIdAsync(userId);
            if (targetUser == null)
            {
                return NotFound(new { message = "Không tìm thấy user." });
            }

            var postsCount = await _postRepository.CountPostsByUserIdAsync(userId);
            var followersCount = await _userRepository.GetFollowersCountAsync(userId);
            var followingCount = await _userRepository.GetFollowingCountAsync(userId);
            var isFollowing = await _userRepository.IsFollowingAsync(currentUser.user_id, userId);

            var dto = new PublicProfileDto
            {
                UserId = targetUser.user_id,
                Username = targetUser.username.Value,
                FullName = targetUser.full_name,
                AvatarUrl = targetUser.avatar_url?.Value,
                Bio = targetUser.bio,
                Website = targetUser.website,
                Address = targetUser.address,
                Hometown = targetUser.hometown,
                Gender = targetUser.gender.ToString(),
                PostsCount = postsCount,
                FollowersCount = followersCount,
                FollowingCount = followingCount,
                IsFollowing = isFollowing
            };

            return Ok(new { message = "Lấy thông tin user thành công", data = dto });
        }

        /// <summary>
        /// Lấy thông tin public của một user khác (by username)
        /// GET /api/users/username/{username}/profile
        /// </summary>
        [HttpGet("username/{username}/profile")]
        public async Task<IActionResult> GetUserProfileByUsername(string username)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                return Unauthorized(new { message = "Token không hợp lệ!" });
            }

            var currentUser = await _userRepository.GetByAccountIdAsync(accountId);
            if (currentUser == null)
            {
                return BadRequest(new { message = "Không tìm thấy user hiện tại." });
            }

            var targetUser = await _userRepository.GetByUsernameAsync(username);
            if (targetUser == null)
            {
                return NotFound(new { message = "Không tìm thấy user." });
            }

            var postsCount = await _postRepository.CountPostsByUserIdAsync(targetUser.user_id);
            var followersCount = await _userRepository.GetFollowersCountAsync(targetUser.user_id);
            var followingCount = await _userRepository.GetFollowingCountAsync(targetUser.user_id);
            var isFollowing = await _userRepository.IsFollowingAsync(currentUser.user_id, targetUser.user_id);

            var dto = new PublicProfileDto
            {
                UserId = targetUser.user_id,
                Username = targetUser.username.Value,
                FullName = targetUser.full_name,
                AvatarUrl = targetUser.avatar_url?.Value,
                Bio = targetUser.bio,
                Website = targetUser.website,
                Address = targetUser.address,
                Hometown = targetUser.hometown,
                Gender = targetUser.gender.ToString(),
                PostsCount = postsCount,
                FollowersCount = followersCount,
                FollowingCount = followingCount,
                IsFollowing = isFollowing
            };

            return Ok(new { message = "Lấy thông tin user thành công", data = dto });
        }

        /// <summary>
        /// Follow một user
        /// POST /api/users/{userId}/follow
        /// </summary>
        [HttpPost("{userId}/follow")]
        public async Task<IActionResult> FollowUser(int userId)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                return Unauthorized(new { message = "Token không hợp lệ!" });
            }

            var currentUser = await _userRepository.GetByAccountIdAsync(accountId);
            if (currentUser == null)
            {
                return BadRequest(new { message = "Không tìm thấy user hiện tại." });
            }

            // Không thể follow chính mình
            if (currentUser.user_id == userId)
            {
                return BadRequest(new { message = "Không thể theo dõi chính mình." });
            }

            var targetUser = await _userRepository.GetByIdAsync(userId);
            if (targetUser == null)
            {
                return NotFound(new { message = "Không tìm thấy user cần theo dõi." });
            }

            await _userRepository.FollowUserAsync(currentUser.user_id, userId);

            return Ok(new { message = "Đã theo dõi user thành công" });
        }

        /// <summary>
        /// Unfollow một user
        /// DELETE /api/users/{userId}/follow
        /// </summary>
        [HttpDelete("{userId}/follow")]
        public async Task<IActionResult> UnfollowUser(int userId)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                return Unauthorized(new { message = "Token không hợp lệ!" });
            }

            var currentUser = await _userRepository.GetByAccountIdAsync(accountId);
            if (currentUser == null)
            {
                return BadRequest(new { message = "Không tìm thấy user hiện tại." });
            }

            await _userRepository.UnfollowUserAsync(currentUser.user_id, userId);

            return Ok(new { message = "Đã hủy theo dõi user" });
        }

        /// <summary>
        /// Lấy danh sách followers của một user
        /// GET /api/users/{userId}/followers
        /// </summary>
        [HttpGet("{userId}/followers")]
        public async Task<IActionResult> GetFollowers(int userId)
        {
            var targetUser = await _userRepository.GetByIdAsync(userId);
            if (targetUser == null)
            {
                return NotFound(new { message = "Không tìm thấy user." });
            }

            // Get list of follower IDs
            var followers = await _userRepository.GetFollowersListAsync(userId);
            
            return Ok(new { message = "Lấy danh sách followers thành công", data = followers });
        }

        /// <summary>
        /// Lấy danh sách following của một user
        /// GET /api/users/{userId}/following
        /// </summary>
        [HttpGet("{userId}/following")]
        public async Task<IActionResult> GetFollowing(int userId)
        {
            var targetUser = await _userRepository.GetByIdAsync(userId);
            if (targetUser == null)
            {
                return NotFound(new { message = "Không tìm thấy user." });
            }

            // Get list of following IDs
            var following = await _userRepository.GetFollowingListAsync(userId);
            
            return Ok(new { message = "Lấy danh sách following thành công", data = following });
        }
    }
}