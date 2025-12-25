using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Services;

namespace UngDungMangXaHoi.Presentation.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "UserOnly")]
    public class SharesController : ControllerBase
    {
        private readonly ShareService _shareService;

        public SharesController(ShareService shareService)
        {
            _shareService = shareService;
        }

        /// <summary>
        /// Chia sẻ một bài đăng
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateShare([FromBody] CreateShareDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _shareService.CreateShareAsync(userId, dto);

                return Ok(new
                {
                    message = "Chia sẻ bài viết thành công",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách shares của một bài đăng
        /// </summary>
        [HttpGet("post/{postId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSharesByPost(int postId)
        {
            try
            {
                var shares = await _shareService.GetSharesByPostAsync(postId);
                return Ok(new { data = shares });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy số lượng shares của một bài đăng
        /// </summary>
        [HttpGet("post/{postId}/count")]
        [AllowAnonymous]
        public async Task<IActionResult> GetShareCount(int postId)
        {
            try
            {
                var count = await _shareService.GetShareCountAsync(postId);
                return Ok(new { count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách shares của user hiện tại
        /// </summary>
        [HttpGet("my-shares")]
        public async Task<IActionResult> GetMyShares()
        {
            try
            {
                var userId = GetCurrentUserId();
                var shares = await _shareService.GetSharesByUserAsync(userId);
                return Ok(new { data = shares });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách shares của một user
        /// </summary>
        [HttpGet("user/{userId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSharesByUser(int userId)
        {
            try
            {
                var shares = await _shareService.GetSharesByUserAsync(userId);
                return Ok(new { data = shares });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Xóa một share
        /// </summary>
        [HttpDelete("{shareId}")]
        public async Task<IActionResult> DeleteShare(int shareId)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _shareService.DeleteShareAsync(shareId, userId);

                return Ok(new { message = "Xóa chia sẻ thành công" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("user_id")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                throw new UnauthorizedAccessException("Không tìm thấy thông tin người dùng");
            }
            return userId;
        }
    }
}
