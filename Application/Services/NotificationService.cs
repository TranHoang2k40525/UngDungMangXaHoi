using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    public class NotificationService : INotificationService
    {
        public async Task SendNotificationAsync(string userId, string message)
        {
            // Implement Firebase or other notification logic here
            await Task.CompletedTask; // Placeholder
        }

        public async Task SendMentionNotificationAsync(int mentionedUserId, string mentionerUsername, int postId, int commentId)
        {
            // TODO: Implement SignalR notification via CommentHub
            // For now, just log the notification
            System.Console.WriteLine($"[NotificationService] Mention notification: @{mentionerUsername} mentioned user {mentionedUserId} in comment {commentId} on post {postId}");
            
            // This should be sent via SignalR CommentHub in WebAPI layer
            // Example: await _hubContext.Clients.User(mentionedUserId.ToString()).SendAsync("ReceiveMention", ...);
            
            await Task.CompletedTask;
        }
    }
}