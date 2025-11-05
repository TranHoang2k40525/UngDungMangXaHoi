using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Services;
using UngDungMangXaHoi.WebAPI.Hubs;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CommentsController : ControllerBase
    {
        private readonly CommentService _commentService;
        private readonly IHubContext<CommentHub> _commentHubContext;
        private readonly IUserRepository _userRepository;

        public CommentsController(
            CommentService commentService, 
            IHubContext<CommentHub> commentHubContext,
            IUserRepository userRepository)
        {
            _commentService = commentService;
            _commentHubContext = commentHubContext;
            _userRepository = userRepository;
        }

        private int GetAccountIdFromToken()
        {
            var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(accountIdClaim, out var accountId) ? accountId : 0;
        }

        private async Task<int> GetUserIdFromAccountIdAsync(int accountId)
        {
            if (accountId == 0) return 0;
            var user = await _userRepository.GetByAccountIdAsync(accountId);
            return user?.user_id ?? 0;
        }

        // GET: api/comments/post/{postId}
        [HttpGet("post/{postId}")]
        public async Task<IActionResult> GetCommentsByPostId(int postId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var accountId = GetAccountIdFromToken();
                var userId = await GetUserIdFromAccountIdAsync(accountId);
                var comments = await _commentService.GetCommentsByPostIdAsync(postId, userId, page, pageSize);
                
                return Ok(new CommentsListResponse
                {
                    Success = true,
                    Comments = comments,
                    TotalCount = comments.Count,
                    Page = page,
                    PageSize = pageSize
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CommentsController] GetCommentsByPostId error: {ex.Message}");
                return StatusCode(500, new { success = false, message = "Lỗi khi tải danh sách bình luận." });
            }
        }

        // GET: api/comments/{commentId}/replies
        [HttpGet("{commentId}/replies")]
        public async Task<IActionResult> GetReplies(int commentId)
        {
            try
            {
                var accountId = GetAccountIdFromToken();
                var userId = await GetUserIdFromAccountIdAsync(accountId);
                var replies = await _commentService.GetRepliesAsync(commentId, userId);
                
                return Ok(new CommentsListResponse
                {
                    Success = true,
                    Comments = replies,
                    TotalCount = replies.Count
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CommentsController] GetReplies error: {ex.Message}");
                return StatusCode(500, new { success = false, message = "Lỗi khi tải danh sách trả lời." });
            }
        }

        // POST: api/comments
        [HttpPost]
        public async Task<IActionResult> CreateComment([FromBody] CreateCommentRequest request)
        {
            try
            {
                var accountId = GetAccountIdFromToken();
                var userId = await GetUserIdFromAccountIdAsync(accountId);
                Console.WriteLine($"[CommentsController] CreateComment - AccountId: {accountId}, UserId: {userId}");
                Console.WriteLine($"[CommentsController] CreateComment - PostId: {request.PostId}, Content: {request.Content}");
                
                if (userId == 0)
                {
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập để bình luận." });
                }

                if (string.IsNullOrWhiteSpace(request.Content))
                {
                    return BadRequest(new { success = false, message = "Nội dung bình luận không được để trống." });
                }

                var comment = await _commentService.CreateCommentAsync(request, userId);
                if (comment == null)
                {
                    return BadRequest(new { success = false, message = "Không thể tạo bình luận." });
                }

                // Broadcast to SignalR clients in real-time
                await _commentHubContext.Clients.Group($"Post_{request.PostId}")
                    .SendAsync("ReceiveComment", comment);

                return Ok(new CommentResponse
                {
                    Success = true,
                    Message = "Đã tạo bình luận thành công.",
                    Comment = comment
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CommentsController] CreateComment error: {ex.Message}");
                Console.WriteLine($"[CommentsController] CreateComment stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[CommentsController] CreateComment inner exception: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { success = false, message = "Lỗi khi tạo bình luận." });
            }
        }

        // PUT: api/comments/{commentId}
        [HttpPut("{commentId}")]
        public async Task<IActionResult> UpdateComment(int commentId, [FromBody] UpdateCommentRequest request)
        {
            try
            {
                var accountId = GetAccountIdFromToken();
                var userId = await GetUserIdFromAccountIdAsync(accountId);
                if (userId == 0)
                {
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập." });
                }

                if (string.IsNullOrWhiteSpace(request.Content))
                {
                    return BadRequest(new { success = false, message = "Nội dung bình luận không được để trống." });
                }

                var comment = await _commentService.UpdateCommentAsync(commentId, request, userId);
                if (comment == null)
                {
                    return NotFound(new { success = false, message = "Không tìm thấy bình luận hoặc bạn không có quyền chỉnh sửa." });
                }

                // Broadcast update to SignalR clients
                await _commentHubContext.Clients.Group($"Post_{comment.PostId}")
                    .SendAsync("CommentUpdated", comment);

                return Ok(new CommentResponse
                {
                    Success = true,
                    Message = "Đã cập nhật bình luận thành công.",
                    Comment = comment
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CommentsController] UpdateComment error: {ex.Message}");
                return StatusCode(500, new { success = false, message = "Lỗi khi cập nhật bình luận." });
            }
        }

        // DELETE: api/comments/{commentId}
        [HttpDelete("{commentId}")]
        public async Task<IActionResult> DeleteComment(int commentId)
        {
            try
            {
                var accountId = GetAccountIdFromToken();
                var userId = await GetUserIdFromAccountIdAsync(accountId);
                if (userId == 0)
                {
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập." });
                }

                // Lấy comment info trước khi xóa để broadcast
                var commentToDelete = await _commentService.GetRepliesAsync(commentId, userId);
                int postId = 0;
                if (commentToDelete != null && commentToDelete.Count > 0)
                {
                    postId = commentToDelete[0].PostId;
                }

                var success = await _commentService.DeleteCommentAsync(commentId, userId);
                if (!success)
                {
                    return NotFound(new { success = false, message = "Không tìm thấy bình luận hoặc bạn không có quyền xóa." });
                }

                // Broadcast deletion to SignalR clients với postId và commentId
                if (postId > 0)
                {
                    await _commentHubContext.Clients.Group($"Post_{postId}")
                        .SendAsync("CommentDeleted", new { commentId, postId });
                }

                return Ok(new { success = true, message = "Đã xóa bình luận thành công.", commentId, postId });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CommentsController] DeleteComment error: {ex.Message}");
                return StatusCode(500, new { success = false, message = "Lỗi khi xóa bình luận." });
            }
        }

        // POST: api/comments/{commentId}/like
        [HttpPost("{commentId}/like")]
        public async Task<IActionResult> LikeComment(int commentId)
        {
            try
            {
                var accountId = GetAccountIdFromToken();
                var userId = await GetUserIdFromAccountIdAsync(accountId);
                if (userId == 0)
                {
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập." });
                }

                var success = await _commentService.LikeCommentAsync(commentId, userId);
                if (!success)
                {
                    return BadRequest(new { success = false, message = "Bạn đã thích bình luận này rồi." });
                }

                // Get updated likes count
                var comment = await _commentService.GetRepliesAsync(commentId, userId);
                int likesCount = 0;
                int postId = 0;
                if (comment != null && comment.Count > 0)
                {
                    likesCount = comment[0].LikesCount;
                    postId = comment[0].PostId;
                }

                // Broadcast like to SignalR clients
                if (postId > 0)
                {
                    await _commentHubContext.Clients.Group($"Post_{postId}")
                        .SendAsync("CommentLiked", new { commentId, likesCount });
                }

                return Ok(new { success = true, message = "Đã thích bình luận.", likesCount });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CommentsController] LikeComment error: {ex.Message}");
                return StatusCode(500, new { success = false, message = "Lỗi khi thích bình luận." });
            }
        }

        // DELETE: api/comments/{commentId}/like
        [HttpDelete("{commentId}/like")]
        public async Task<IActionResult> UnlikeComment(int commentId)
        {
            try
            {
                var accountId = GetAccountIdFromToken();
                var userId = await GetUserIdFromAccountIdAsync(accountId);
                if (userId == 0)
                {
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập." });
                }

                var success = await _commentService.UnlikeCommentAsync(commentId, userId);
                if (!success)
                {
                    return BadRequest(new { success = false, message = "Bạn chưa thích bình luận này." });
                }

                // Get updated likes count
                var comment = await _commentService.GetRepliesAsync(commentId, userId);
                int likesCount = 0;
                int postId = 0;
                if (comment != null && comment.Count > 0)
                {
                    likesCount = comment[0].LikesCount;
                    postId = comment[0].PostId;
                }

                // Broadcast unlike to SignalR clients
                if (postId > 0)
                {
                    await _commentHubContext.Clients.Group($"Post_{postId}")
                        .SendAsync("CommentLiked", new { commentId, likesCount });
                }

                return Ok(new { success = true, message = "Đã bỏ thích bình luận.", likesCount });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CommentsController] UnlikeComment error: {ex.Message}");
                return StatusCode(500, new { success = false, message = "Lỗi khi bỏ thích bình luận." });
            }
        }
    }
}
