using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace UngDungMangXaHoi.Presentation.WebAPI.Hubs
{
    /// <summary>
    /// SignalR Hub cho thông báo real-time
    /// </summary>
    [Authorize]
    public class NotificationHub : Hub
    {
        // Lưu trữ mapping giữa userId và connectionId
        private static readonly ConcurrentDictionary<int, HashSet<string>> _userConnections = new();

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserIdFromContext();
            
            if (userId.HasValue)
            {
                // Thêm connection vào danh sách của user
                _userConnections.AddOrUpdate(
                    userId.Value,
                    new HashSet<string> { Context.ConnectionId },
                    (key, existingSet) =>
                    {
                        existingSet.Add(Context.ConnectionId);
                        return existingSet;
                    });

                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId.Value}");
                Console.WriteLine($"[NotificationHub] User {userId.Value} connected: {Context.ConnectionId}");
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserIdFromContext();
            
            if (userId.HasValue)
            {
                // Xóa connection khỏi danh sách của user
                if (_userConnections.TryGetValue(userId.Value, out var connections))
                {
                    connections.Remove(Context.ConnectionId);
                    
                    // Nếu user không còn connection nào, xóa khỏi dictionary
                    if (connections.Count == 0)
                    {
                        _userConnections.TryRemove(userId.Value, out _);
                    }
                }

                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId.Value}");
                Console.WriteLine($"[NotificationHub] User {userId.Value} disconnected: {Context.ConnectionId}");
            }

            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Gửi thông báo real-time cho một user cụ thể
        /// </summary>
        public static async Task SendNotificationToUser(IHubContext<NotificationHub> hubContext, int userId, object notification)
        {
            await hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveNotification", notification);
            Console.WriteLine($"[NotificationHub] Notification sent to user {userId}");
        }

        /// <summary>
        /// Gửi cập nhật số lượng reactions real-time
        /// </summary>
        public static async Task SendReactionUpdate(IHubContext<NotificationHub> hubContext, int postOwnerId, object reactionData)
        {
            await hubContext.Clients.Group($"user_{postOwnerId}").SendAsync("ReceiveReactionUpdate", reactionData);
            Console.WriteLine($"[NotificationHub] Reaction update sent to user {postOwnerId}");
        }

        /// <summary>
        /// Gửi cập nhật share real-time
        /// </summary>
        public static async Task SendShareUpdate(IHubContext<NotificationHub> hubContext, int postOwnerId, object shareData)
        {
            await hubContext.Clients.Group($"user_{postOwnerId}").SendAsync("ReceiveShareUpdate", shareData);
            Console.WriteLine($"[NotificationHub] Share update sent to user {postOwnerId}");
        }

        /// <summary>
        /// Check xem user có đang online không
        /// </summary>
        public static bool IsUserOnline(int userId)
        {
            return _userConnections.ContainsKey(userId);
        }

        /// <summary>
        /// Lấy userId từ JWT claims
        /// </summary>
        private int? GetUserIdFromContext()
        {
            var userIdClaim = Context.User?.FindFirst("user_id")?.Value;
            
            if (int.TryParse(userIdClaim, out int userId))
            {
                return userId;
            }

            return null;
        }
    }
}
