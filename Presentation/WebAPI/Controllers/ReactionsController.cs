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
    public class ReactionsController : ControllerBase
    {
        private readonly ReactionService _reactionService;

        public ReactionsController(ReactionService reactionService)
        {
            _reactionService = reactionService;
        }

        /// <summary>
        /// Thả cảm xúc hoặc thay đổi cảm xúc trên bài đăng
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> AddOrUpdateReaction([FromBody] CreateReactionDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _reactionService.AddOrUpdateReactionAsync(userId, dto);

                if (result == null)
                {
                    return Ok(new { message = "Đã xóa cảm xúc thành công" });
                }

                return Ok(new
                {
                    message = "Thả cảm xúc thành công",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy tổng hợp reactions của một bài đăng
        /// </summary>
        [HttpGet("post/{postId}/summary")]
        [AllowAnonymous]
        public async Task<IActionResult> GetReactionSummary(int postId)
        {
            try
            {
                int? currentUserId = null;
                if (User.Identity?.IsAuthenticated == true)
                {
                    currentUserId = GetCurrentUserId();
                }

                var summary = await _reactionService.GetReactionSummaryAsync(postId, currentUserId);
                return Ok(new { data = summary });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách chi tiết reactions của một bài đăng
        /// </summary>
        [HttpGet("post/{postId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetReactionsByPost(int postId)
        {
            try
            {
                var reactions = await _reactionService.GetReactionsByPostAsync(postId);
                return Ok(new { data = reactions });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                throw new UnauthorizedAccessException("Không tìm thấy thông tin người dùng");
            }
            return userId;
        }
    }
}
