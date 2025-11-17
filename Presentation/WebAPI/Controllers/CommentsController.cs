using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Services;
using Microsoft.AspNetCore.SignalR;
using UngDungMangXaHoi.Presentation.WebAPI.Hubs;

namespace UngDungMangXaHoi.Presentation.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly CommentService _commentService;
    private readonly IHubContext<CommentHub> _commentHubContext;

    public CommentsController(CommentService commentService, IHubContext<CommentHub> commentHubContext)
    {
        _commentService = commentService;
        _commentHubContext = commentHubContext;
    }

    private int GetCurrentAccountId()
    {
        var accountIdClaim = User.FindFirst("AccountId")?.Value 
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        if (string.IsNullOrEmpty(accountIdClaim))
            throw new UnauthorizedAccessException("Account ID not found in token");
        
        return int.Parse(accountIdClaim);
    }

    // GET: api/Comments/{postId} - Get comments by post (alternative route)
    [HttpGet("{postId:int}")]
    public async Task<ActionResult<object>> GetCommentsByPostId(int postId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var currentAccountId = GetCurrentAccountId();
            var comments = await _commentService.GetCommentsByPostIdAsync(postId);
            
            // Transform to format expected by frontend
            var transformedComments = comments.Select(c => new
            {
                commentId = c.CommentId,
                content = c.Content,
                // Database lưu local time (UTC+7), trả về as-is để frontend tính toán
                // Không convert sang UTC vì sẽ bị lệch timezone
                createdAt = c.CreatedAt,
                userId = c.UserId, // Trả về UserId (user_id từ bảng users) để frontend điều hướng đúng profile
                accountId = c.AccountId, // Giữ accountId cho backward compatibility
                username = c.AuthorName,
                userAvatar = c.AuthorAvatar,
                parentCommentId = c.ParentCommentId, // Quan trọng: Để frontend phân biệt reply vs comment
                likesCount = c.ReactionCounts.Values.Sum(),
                isLiked = false, // TODO: Check if current user reacted
                isEdited = c.IsEdited
            });
            
            // Return in format expected by frontend
            return Ok(new 
            { 
                comments = transformedComments,
                total = comments.Count(),
                page = page,
                pageSize = pageSize
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving comments", error = ex.Message });
        }
    }

    // GET: api/Comments/{postId}/count - Get comment count for a post
    [HttpGet("{postId:int}/count")]
    public async Task<ActionResult<object>> GetCommentCount(int postId)
    {
        try
        {
            var comments = await _commentService.GetCommentsByPostIdAsync(postId);
            return Ok(new { count = comments.Count() });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving comment count", error = ex.Message });
        }
    }

    // GET: api/Comments/post/{postId}
    [HttpGet("post/{postId}")]
    public async Task<ActionResult<IEnumerable<CommentDto>>> GetCommentsByPost(int postId)
    {
        try
        {
            var comments = await _commentService.GetCommentsByPostIdAsync(postId);
            return Ok(comments);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving comments", error = ex.Message });
        }
    }

    // GET: api/Comments/{commentId}/replies
    [HttpGet("{commentId}/replies")]
    public async Task<ActionResult<IEnumerable<CommentDto>>> GetReplies(int commentId)
    {
        try
        {
            var replies = await _commentService.GetRepliesAsync(commentId);
            return Ok(replies);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving replies", error = ex.Message });
        }
    }

    // POST: api/Comments
    [HttpPost]
    public async Task<ActionResult<object>> CreateComment([FromBody] CreateCommentDto dto)
    {
        try
        {
            var accountId = GetCurrentAccountId();
            var comment = await _commentService.CreateCommentAsync(dto, accountId);
            
            // Transform to frontend format - Trả về đầy đủ thông tin để frontend không cần reload
            var response = new
            {
                commentId = comment.CommentId,
                userId = comment.UserId, // userId để frontend check ownership và navigate profile
                accountId = comment.AccountId,
                username = comment.AuthorName,
                userAvatar = comment.AuthorAvatar,
                content = comment.Content,
                parentCommentId = comment.ParentCommentId, // Quan trọng: để frontend biết đây là reply
                createdAt = comment.CreatedAt,
                isEdited = comment.IsEdited,
                likesCount = 0
            };
            
            // Broadcast to clients watching this post. If it's a reply, use CommentReplyAdded
            try
            {
                if (response.parentCommentId != null && response.parentCommentId != 0)
                {
                    await _commentHubContext.Clients.Group($"post_{dto.PostId}").SendAsync("CommentReplyAdded", new
                    {
                        parentCommentId = response.parentCommentId,
                        replyComment = response,
                        timestamp = DateTime.UtcNow
                    });
                }
                else
                {
                    await _commentHubContext.Clients.Group($"post_{dto.PostId}").SendAsync("ReceiveComment", response);
                }
            }
            catch { /* don't let realtime errors block API response */ }

            return CreatedAtAction(nameof(GetCommentsByPost), new { postId = dto.PostId }, response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating comment", error = ex.Message });
        }
    }

    // POST: api/Comments/reactions - Add/update reaction to comment
    [HttpPost("reactions")]
    public async Task<ActionResult> AddCommentReaction([FromBody] CreateCommentReactionDto dto)
    {
        try
        {
            var accountId = GetCurrentAccountId();
            await _commentService.AddReactionAsync(dto.CommentId, accountId, dto.ReactionType);
            return Ok(new { message = "Reaction added successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error adding reaction", error = ex.Message });
        }
    }

    // PUT: api/Comments/{commentId}
    [HttpPut("{commentId}")]
    public async Task<ActionResult<CommentDto>> UpdateComment(int commentId, [FromBody] UpdateCommentDto dto)
    {
        try
        {
            var accountId = GetCurrentAccountId();
            var comment = await _commentService.UpdateCommentAsync(commentId, dto.Content, accountId);

            // Broadcast updated comment
            try
            {
                await _commentHubContext.Clients.Group($"post_{comment.PostId}").SendAsync("CommentUpdated", comment);
            }
            catch { }

            return Ok(comment);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating comment", error = ex.Message });
        }
    }

    // DELETE: api/Comments/{commentId}
    [HttpDelete("{commentId}")]
    public async Task<ActionResult> DeleteComment(int commentId)
    {
        try
        {
            var accountId = GetCurrentAccountId();
            var deletedComment = await _commentService.DeleteCommentAsync(commentId, accountId);

            // Broadcast deletion to post group
            try
            {
                await _commentHubContext.Clients.Group($"post_{deletedComment.PostId}").SendAsync("CommentDeleted", new
                {
                    postId = deletedComment.PostId,
                    commentId = commentId,
                    deletedBy = accountId,
                    timestamp = DateTime.UtcNow
                });
            }
            catch { }

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting comment", error = ex.Message });
        }
    }

    // GET: api/Comments/{commentId}/history
    // TODO: Implement edit history tracking
    /*[HttpGet("{commentId}/history")]
    public async Task<ActionResult<IEnumerable<CommentEditHistoryDto>>> GetEditHistory(int commentId)
    {
        try
        {
            var history = await _commentService.GetEditHistoryAsync(commentId);
            return Ok(history);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving edit history", error = ex.Message });
        }
    }*/

    // POST: api/Comments/{commentId}/react
    [HttpPost("{commentId}/react")]
    public async Task<ActionResult> AddReaction(int commentId, [FromBody] CommentReactionDto dto)
    {
        try
        {
            var accountId = GetCurrentAccountId();
            await _commentService.AddReactionAsync(commentId, accountId, dto.ReactionType);
            return Ok(new { message = "Reaction added successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error adding reaction", error = ex.Message });
        }
    }

    // DELETE: api/Comments/{commentId}/react
    [HttpDelete("{commentId}/react")]
    public async Task<ActionResult> RemoveReaction(int commentId)
    {
        try
        {
            var accountId = GetCurrentAccountId();
            await _commentService.RemoveReactionAsync(commentId, accountId);
            return Ok(new { message = "Reaction removed successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error removing reaction", error = ex.Message });
        }
    }

    // GET: api/Comments/{commentId}/reactions
    [HttpGet("{commentId}/reactions")]
    public async Task<ActionResult<Dictionary<string, int>>> GetReactionCounts(int commentId)
    {
        try
        {
            var counts = await _commentService.GetReactionCountsAsync(commentId);
            return Ok(counts);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving reaction counts", error = ex.Message });
        }
    }

    // GET: api/Comments/search?query=text&postId=1
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<CommentDto>>> SearchComments([FromQuery] string query, [FromQuery] int? postId = null)
    {
        try
        {
            // This would need to be implemented in CommentService
            return Ok(new List<CommentDto>());
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error searching comments", error = ex.Message });
        }
    }
}
