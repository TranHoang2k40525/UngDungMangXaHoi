using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Services;
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
    private readonly IBlockRepository _blockRepository;
    private readonly UserService _userService;

        public UserController(IUserRepository userRepository, IPostRepository postRepository, IBlockRepository blockRepository)
        {
            _userRepository = userRepository;
            _postRepository = postRepository;
            _blockRepository = blockRepository;
            _userService = new UserService(userRepository, postRepository, blockRepository);
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
            var profile = await _userService.GetPublicProfileByIdAsync(accountId, userId);
            if (profile == null) return NotFound(new { message = "Không tìm thấy user." });
            return Ok(new { message = "Lấy thông tin user thành công", data = profile });
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
            var profile = await _userService.GetPublicProfileByUsernameAsync(accountId, username);
            if (profile == null) return NotFound(new { message = "Không tìm thấy user." });
            return Ok(new { message = "Lấy thông tin user thành công", data = profile });
        }

        /// <summary>
        /// Block a user
        /// POST /api/users/{userId}/block
        /// </summary>
        [HttpPost("{userId}/block")]
        public async Task<IActionResult> BlockUser(int userId)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                return Unauthorized(new { message = "Token không hợp lệ!" });
            }

            var currentUser = await _userRepository.GetByAccountIdAsync(accountId);
            if (currentUser == null) return BadRequest(new { message = "Không tìm thấy user hiện tại." });
            if (currentUser.user_id == userId) return BadRequest(new { message = "Không thể chặn chính mình." });

            var target = await _userRepository.GetByIdAsync(userId);
            if (target == null) return NotFound(new { message = "Không tìm thấy user." });

            await _userService.BlockUserAsync(currentUser.user_id, userId);

            return Ok(new { message = "Đã chặn user" });
        }

        /// <summary>
        /// Unblock a user
        /// DELETE /api/users/{userId}/block
        /// </summary>
        [HttpDelete("{userId}/block")]
        public async Task<IActionResult> UnblockUser(int userId)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                return Unauthorized(new { message = "Token không hợp lệ!" });
            }

            var currentUser = await _userRepository.GetByAccountIdAsync(accountId);
            if (currentUser == null) return BadRequest(new { message = "Không tìm thấy user hiện tại." });

            await _userService.UnblockUserAsync(currentUser.user_id, userId);
            return Ok(new { message = "Đã bỏ chặn user" });
        }

        /// <summary>
        /// Get blocked users list for current user
        /// GET /api/users/blocked
        /// </summary>
        [HttpGet("blocked")]
        public async Task<IActionResult> GetBlockedUsers()
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                return Unauthorized(new { message = "Token không hợp lệ!" });
            }

            var currentUser = await _userRepository.GetByAccountIdAsync(accountId);
            if (currentUser == null) return BadRequest(new { message = "Không tìm thấy user hiện tại." });

                var list = await _userService.GetBlockedUsersAsync(currentUser.user_id);
            return Ok(new { message = "Lấy danh sách chặn thành công", data = list });
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

            await _userService.FollowUserAsync(currentUser.user_id, userId);

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

            await _userService.UnfollowUserAsync(currentUser.user_id, userId);

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