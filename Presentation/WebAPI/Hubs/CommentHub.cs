using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using UngDungMangXaHoi.Application.DTOs;

namespace UngDungMangXaHoi.WebAPI.Hubs
{
    public class CommentHub : Hub
    {
        // Client joins a specific post's comment room
        public async Task JoinPostComments(int postId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Post_{postId}");
            Console.WriteLine($"[CommentHub] User {Context.ConnectionId} joined Post_{postId}");
        }

        // Client leaves a post's comment room
        public async Task LeavePostComments(int postId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Post_{postId}");
            Console.WriteLine($"[CommentHub] User {Context.ConnectionId} left Post_{postId}");
        }

        // Broadcast new comment to all clients in the post room
        public async Task SendComment(int postId, CommentDto comment)
        {
            await Clients.Group($"Post_{postId}").SendAsync("ReceiveComment", comment);
        }

        // Broadcast comment update
        public async Task UpdateComment(int postId, CommentDto comment)
        {
            await Clients.Group($"Post_{postId}").SendAsync("CommentUpdated", comment);
        }

        // Broadcast comment deletion
        public async Task DeleteComment(int postId, int commentId)
        {
            await Clients.Group($"Post_{postId}").SendAsync("CommentDeleted", commentId);
        }

        // Broadcast comment like/unlike
        public async Task LikeComment(int postId, int commentId, int likesCount)
        {
            await Clients.Group($"Post_{postId}").SendAsync("CommentLiked", new { commentId, likesCount });
        }

        // Typing indicator (optional)
        public async Task UserTyping(int postId, string username)
        {
            await Clients.OthersInGroup($"Post_{postId}").SendAsync("UserTyping", username);
        }

        public async Task UserStoppedTyping(int postId, string username)
        {
            await Clients.OthersInGroup($"Post_{postId}").SendAsync("UserStoppedTyping", username);
        }

        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"[CommentHub] Client connected: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"[CommentHub] Client disconnected: {Context.ConnectionId}");
            await base.OnDisconnectedAsync(exception);
        }
    }
}
