using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using UngDungMangXaHoi.Application.DTOs;
using System.Security.Claims;

namespace UngDungMangXaHoi.Presentation.WebAPI.Hubs;

/// <summary>
/// Hub xử lý real-time comments cho bài viết
/// </summary>
[Authorize]
public class CommentHub : Hub
{
    private readonly ILogger<CommentHub> _logger;

    public CommentHub(ILogger<CommentHub> logger)
    {
        _logger = logger;
    }
    // Client joins a post room to receive real-time comments for that post
    public async Task JoinPostRoom(int postId)
    {
        try
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            await Groups.AddToGroupAsync(Context.ConnectionId, $"post_{postId}");
            _logger.LogInformation($"User {userId} joined post room {postId}");
            
            // Thông báo cho người khác
            await Clients.OthersInGroup($"post_{postId}").SendAsync("UserJoinedPost", new
            {
                userId,
                postId,
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error joining post room {postId}");
        }
    }

    // Client leaves a post room
    public async Task LeavePostRoom(int postId)
    {
        try
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"post_{postId}");
            _logger.LogInformation($"User {userId} left post room {postId}");
            
            await Clients.OthersInGroup($"post_{postId}").SendAsync("UserLeftPost", new
            {
                userId,
                postId,
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error leaving post room {postId}");
        }
    }

    // Broadcast new comment to all users in the post room
    public async Task SendCommentToPost(int postId, CommentDto comment)
    {
        await Clients.Group($"post_{postId}").SendAsync("ReceiveComment", comment);
    }

    // Broadcast comment update to all users in the post room
    public async Task SendCommentUpdate(int postId, CommentDto comment)
    {
        await Clients.Group($"post_{postId}").SendAsync("CommentUpdated", comment);
    }

    // Broadcast comment deletion to all users in the post room
    public async Task SendCommentDeletion(int postId, int commentId)
    {
        await Clients.Group($"post_{postId}").SendAsync("CommentDeleted", commentId);
    }

    // Broadcast reaction to all users in the post room
    public async Task SendReaction(int postId, int commentId, string reactionType, int accountId)
    {
        await Clients.Group($"post_{postId}").SendAsync("CommentReactionAdded", new
        {
            commentId,
            reactionType,
            accountId
        });
    }

    // Broadcast reaction removal to all users in the post room
    public async Task SendReactionRemoval(int postId, int commentId, int accountId)
    {
        await Clients.Group($"post_{postId}").SendAsync("CommentReactionRemoved", new
        {
            commentId,
            accountId
        });
    }

    // User is typing (for real-time typing indicator)
    public async Task UserTyping(int postId, string username)
    {
        await Clients.OthersInGroup($"post_{postId}").SendAsync("UserTypingComment", username);
    }

    // User stopped typing
    public async Task UserStoppedTyping(int postId, string username)
    {
        await Clients.OthersInGroup($"post_{postId}").SendAsync("UserStoppedTypingComment", username);
    }

    /// <summary>
    /// Thêm comment mới (real-time)
    /// </summary>
    public async Task AddComment(int postId, CommentDto comment)
    {
        try
        {
            _logger.LogInformation($"Adding comment to post {postId}");
            await Clients.Group($"post_{postId}").SendAsync("ReceiveComment", comment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error adding comment to post {postId}");
        }
    }

    /// <summary>
    /// Chỉnh sửa comment (real-time)
    /// </summary>
    public async Task EditComment(int postId, int commentId, string newContent, CommentDto updatedComment)
    {
        try
        {
            _logger.LogInformation($"Editing comment {commentId} in post {postId}");
            await Clients.Group($"post_{postId}").SendAsync("CommentUpdated", updatedComment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error editing comment {commentId}");
        }
    }

    /// <summary>
    /// Xóa comment (real-time)
    /// </summary>
    public async Task DeleteComment(int postId, int commentId)
    {
        try
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            _logger.LogInformation($"User {userId} deleting comment {commentId} in post {postId}");
            
            await Clients.Group($"post_{postId}").SendAsync("CommentDeleted", new
            {
                postId,
                commentId,
                deletedBy = userId,
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error deleting comment {commentId}");
        }
    }

    /// <summary>
    /// Reply comment (real-time)
    /// </summary>
    public async Task ReplyComment(int postId, int parentCommentId, CommentDto replyComment)
    {
        try
        {
            _logger.LogInformation($"Replying to comment {parentCommentId} in post {postId}");
            await Clients.Group($"post_{postId}").SendAsync("CommentReplyAdded", new
            {
                parentCommentId,
                replyComment,
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error replying to comment {parentCommentId}");
        }
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _logger.LogInformation($"CommentHub - Client connected: {Context.ConnectionId}, User: {userId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _logger.LogInformation($"CommentHub - Client disconnected: {Context.ConnectionId}, User: {userId}");
        await base.OnDisconnectedAsync(exception);
    }
}
