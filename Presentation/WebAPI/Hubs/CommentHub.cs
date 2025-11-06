using Microsoft.AspNetCore.SignalR;
using UngDungMangXaHoi.Application.DTOs;

namespace UngDungMangXaHoi.Presentation.WebAPI.Hubs;

public class CommentHub : Hub
{
    // Client joins a post room to receive real-time comments for that post
    public async Task JoinPostRoom(int postId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"post_{postId}");
    }

    // Client leaves a post room
    public async Task LeavePostRoom(int postId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"post_{postId}");
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
}
