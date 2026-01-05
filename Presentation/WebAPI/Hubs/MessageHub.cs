using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Services;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Presentation.WebAPI.Hubs
{
    [Authorize]
    public class MessageHub : Hub
    {
        private readonly MessageService _messageService;
        private readonly AppDbContext _context;
        // Sử dụng ConcurrentDictionary với HashSet để hỗ trợ multiple connections
        private static readonly ConcurrentDictionary<int, HashSet<string>> _userConnections = new();

        public MessageHub(MessageService messageService, AppDbContext context)
        {
            _messageService = messageService;
            _context = context;
        }

        private int? GetCurrentUserId()
        {
            // CRITICAL: Use "user_id" claim first (actual user_id in database)
            var userIdClaim = Context.User?.FindFirst("user_id")?.Value
                              ?? Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                              ?? Context.User?.FindFirst("nameid")?.Value;
            
            return int.TryParse(userIdClaim, out int userId) ? userId : null;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetCurrentUserId();
            
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
                
                Console.WriteLine($"[MessageHub] User {userId.Value} connected with ConnectionId: {Context.ConnectionId}");
                
                // Thông báo cho user đã online
                await Clients.Others.SendAsync("UserOnline", userId.Value);
            }
            else
            {
                Console.WriteLine($"[MessageHub] OnConnectedAsync - user_id claim not found. Claims: {string.Join(", ", Context.User?.Claims.Select(c => $"{c.Type}={c.Value}") ?? new string[0])}");
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetCurrentUserId();
            
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
                        
                        // Lưu thời điểm offline vào database
                        try
                        {
                            await _context.Users
                                .Where(u => u.user_id == userId.Value)
                                .ExecuteUpdateAsync(u => u.SetProperty(x => x.last_seen, DateTime.UtcNow));
                            Console.WriteLine($"[MessageHub] Updated last_seen for user {userId.Value}");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[MessageHub] Error updating last_seen: {ex.Message}");
                        }
                        
                        // Thông báo cho user đã offline
                        await Clients.Others.SendAsync("UserOffline", userId.Value);
                    }
                }
                
                Console.WriteLine($"[MessageHub] User {userId.Value} disconnected");
            }

            await base.OnDisconnectedAsync(exception);
        }

        // Gửi tin nhắn
        public async Task SendMessage(SendMessageDto dto)
        {
            try
            {
                var senderId = GetCurrentUserId();
                
                if (!senderId.HasValue)
                {
                    Console.WriteLine($"[MessageHub] SendMessage - Unauthorized. Claims: {string.Join(", ", Context.User?.Claims.Select(c => $"{c.Type}={c.Value}") ?? new string[0])}");
                    await Clients.Caller.SendAsync("Error", "Unauthorized");
                    return;
                }

                Console.WriteLine($"[MessageHub] SendMessage - senderId: {senderId.Value}, receiverId: {dto.receiver_id}, content: {dto.content}");

                // Gửi tin nhắn qua service
                var message = await _messageService.SendMessageAsync(senderId.Value, dto);

                if (message == null)
                {
                    await Clients.Caller.SendAsync("Error", "Failed to send message");
                    return;
                }

                // Gửi tin nhắn cho người gửi (confirmation)
                await Clients.Caller.SendAsync("MessageSent", message);

                // Gửi tin nhắn cho người nhận nếu họ đang online (gửi cho tất cả connections)
                if (_userConnections.TryGetValue(dto.receiver_id, out var receiverConnections))
                {
                    foreach (var connectionId in receiverConnections)
                    {
                        await Clients.Client(connectionId).SendAsync("ReceiveMessage", message);
                    }
                }

                Console.WriteLine($"[MessageHub] Message sent from {senderId} to {dto.receiver_id}");
            }
            catch (UnauthorizedAccessException ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MessageHub] Error: {ex.Message}");
                await Clients.Caller.SendAsync("Error", "An error occurred while sending message");
            }
        }

        // Đánh dấu đã đọc
        public async Task MarkAsRead(int conversationId)
        {
            try
            {
                var userId = GetCurrentUserId();
                
                if (!userId.HasValue)
                {
                    await Clients.Caller.SendAsync("Error", "Unauthorized");
                    return;
                }

                await _messageService.MarkAsReadAsync(conversationId, userId.Value);

                // Thông báo cho người gửi rằng tin nhắn đã được đọc
                await Clients.Caller.SendAsync("MessagesRead", new { conversationId, userId = userId.Value });

                Console.WriteLine($"[MessageHub] User {userId} marked conversation {conversationId} as read");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MessageHub] Error marking as read: {ex.Message}");
                await Clients.Caller.SendAsync("Error", "An error occurred");
            }
        }

        // Typing indicator
        public async Task UserTyping(int receiverId, bool isTyping)
        {
            try
            {
                var senderId = GetCurrentUserId();
                
                if (!senderId.HasValue)
                {
                    return;
                }

                // Support multiple connections per user
                if (_userConnections.TryGetValue(receiverId, out HashSet<string>? receiverConnections))
                {
                    foreach (var connectionId in receiverConnections)
                    {
                        await Clients.Client(connectionId).SendAsync("UserTyping", new 
                        { 
                            userId = senderId.Value, 
                            isTyping 
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MessageHub] Error in UserTyping: {ex.Message}");
            }
        }

        // Lấy danh sách users online
        public async Task GetOnlineUsers()
        {
            try
            {
                var onlineUserIds = _userConnections.Keys.ToList();
                await Clients.Caller.SendAsync("OnlineUsers", onlineUserIds);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MessageHub] Error getting online users: {ex.Message}");
            }
        }

        // Xóa tin nhắn
        public async Task DeleteMessage(int messageId)
        {
            try
            {
                var userId = GetCurrentUserId();
                
                if (!userId.HasValue)
                {
                    await Clients.Caller.SendAsync("Error", "Unauthorized");
                    return;
                }

                var success = await _messageService.DeleteMessageAsync(messageId, userId.Value);

                if (success)
                {
                    await Clients.Caller.SendAsync("MessageDeleted", messageId);
                    Console.WriteLine($"[MessageHub] Message {messageId} deleted by user {userId.Value}");
                }
                else
                {
                    await Clients.Caller.SendAsync("Error", "Failed to delete message");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MessageHub] Error deleting message: {ex.Message}");
                await Clients.Caller.SendAsync("Error", "An error occurred");
            }
        }

        // Thu hồi tin nhắn
        public async Task RecallMessage(int messageId)
        {
            try
            {
                var userId = GetCurrentUserId();
                
                if (!userId.HasValue)
                {
                    await Clients.Caller.SendAsync("Error", "Unauthorized");
                    return;
                }

                Console.WriteLine($"[MessageHub] RecallMessage - messageId: {messageId}, userId: {userId.Value}");

                var recalledMessage = await _messageService.RecallMessageAsync(messageId, userId.Value);

                if (recalledMessage == null)
                {
                    await Clients.Caller.SendAsync("Error", "Failed to recall message");
                    return;
                }

                // Broadcast to both sender and receiver
                await Clients.All.SendAsync("MessageRecalled", recalledMessage);
                Console.WriteLine($"[MessageHub] Message {messageId} recalled by user {userId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MessageHub] Error recalling message: {ex.Message}");
                await Clients.Caller.SendAsync("Error", "An error occurred");
            }
        }

        /// <summary>
        /// Check xem user có đang online không
        /// </summary>
        public static bool IsUserOnline(int userId)
        {
            return _userConnections.ContainsKey(userId);
        }
    }
}
