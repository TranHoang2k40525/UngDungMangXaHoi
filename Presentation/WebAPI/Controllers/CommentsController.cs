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
                likesCount = c.ReactionCounts.Count, // Total reactions count
                isLiked = c.ReactionCounts.Any(kvp => kvp.Key.EndsWith($"_{currentAccountId}")), // Check if current user liked
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
            var count = await _commentService.GetCommentCountAsync(postId);
            return Ok(new { count });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving comment count", error = ex.Message });
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

            return CreatedAtAction(nameof(GetCommentsByPostId), new { postId = dto.PostId }, response);
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
            
            // Get updated comment to get postId and new reaction count
            var updatedComment = await _commentService.GetCommentByIdAsync(dto.CommentId);
            
            if (updatedComment != null)
            {
                // Broadcast reaction event (not full comment) to avoid overriding isLiked for other users
                try
                {
                    await _commentHubContext.Clients.Group($"post_{updatedComment.PostId}").SendAsync("CommentReactionChanged", new
                    {
                        commentId = dto.CommentId,
                        accountId = accountId,
                        reactionType = dto.ReactionType,
                        newLikesCount = updatedComment.ReactionCounts.Count,
                        isAdded = true
                    });
                }
                catch { /* Ignore broadcast errors */ }
            }
            
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

    // DELETE: api/Comments/{commentId}/react
    [HttpDelete("{commentId}/react")]
    public async Task<ActionResult> RemoveReaction(int commentId)
    {
        try
        {
            var accountId = GetCurrentAccountId();
            await _commentService.RemoveReactionAsync(commentId, accountId);
            
            // Get updated comment to get postId and new reaction count
            var updatedComment = await _commentService.GetCommentByIdAsync(commentId);
            
            if (updatedComment != null)
            {
                // Broadcast reaction event (not full comment) to avoid overriding isLiked for other users
                try
                {
                    await _commentHubContext.Clients.Group($"post_{updatedComment.PostId}").SendAsync("CommentReactionChanged", new
                    {
                        commentId = commentId,
                        accountId = accountId,
                        reactionType = "Like",
                        newLikesCount = updatedComment.ReactionCounts.Count,
                        isAdded = false
                    });
                }
                catch { /* Ignore broadcast errors */ }
            }
            
            return Ok(new { message = "Reaction removed successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error removing reaction", error = ex.Message });
        }
    }

}
