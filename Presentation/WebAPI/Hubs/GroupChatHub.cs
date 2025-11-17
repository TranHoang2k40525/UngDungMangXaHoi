using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Text.Json;
using UngDungMangXaHoi.Application.Services;
using UngDungMangXaHoi.Application.DTOs;

namespace UngDungMangXaHoi.Presentation.WebAPI.Hubs
{
    /// <summary>
    /// Hub xử lý real-time messaging cho Group Chat
    /// </summary>
    [Authorize]
    public class GroupChatHub : Hub
    {
        private readonly ILogger<GroupChatHub> _logger;
        private readonly GroupMessageService _messageService;
        private readonly GroupChatService _groupChatService;
        private static readonly Dictionary<string, HashSet<string>> _groupConnections = new();
        private static readonly Dictionary<string, string> _userConnections = new();

        public GroupChatHub(ILogger<GroupChatHub> logger, GroupMessageService messageService, GroupChatService groupChatService)
        {
            _logger = logger;
            _messageService = messageService;
            _groupChatService = groupChatService;
        }

        /// <summary>
        /// Join vào một nhóm chat
        /// </summary>
        public async Task JoinGroup(string conversationId)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var connectionId = Context.ConnectionId;

                await Groups.AddToGroupAsync(connectionId, conversationId);

                // Track connection
                lock (_groupConnections)
                {
                    if (!_groupConnections.ContainsKey(conversationId))
                    {
                        _groupConnections[conversationId] = new HashSet<string>();
                    }
                    _groupConnections[conversationId].Add(connectionId);
                }

                if (!string.IsNullOrEmpty(userId))
                {
                    _userConnections[connectionId] = userId;
                }

                _logger.LogInformation($"User {userId} joined group {conversationId}");

                // Thông báo cho các thành viên khác
                await Clients.OthersInGroup(conversationId).SendAsync("UserJoined", new
                {
                    userId,
                    connectionId,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error joining group {conversationId}");
                throw;
            }
        }

        /// <summary>
        /// Leave khỏi một nhóm chat
        /// </summary>
        public async Task LeaveGroup(string conversationId)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var connectionId = Context.ConnectionId;

                await Groups.RemoveFromGroupAsync(connectionId, conversationId);

                // Remove tracking
                lock (_groupConnections)
                {
                    if (_groupConnections.ContainsKey(conversationId))
                    {
                        _groupConnections[conversationId].Remove(connectionId);
                        if (_groupConnections[conversationId].Count == 0)
                        {
                            _groupConnections.Remove(conversationId);
                        }
                    }
                }

                _userConnections.Remove(connectionId);

                _logger.LogInformation($"User {userId} left group {conversationId}");

                // Thông báo cho các thành viên khác
                await Clients.OthersInGroup(conversationId).SendAsync("UserLeft", new
                {
                    userId,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error leaving group {conversationId}");
                throw;
            }
        }

        /// <summary>
        /// Gửi tin nhắn đến nhóm (LƯU DATABASE + broadcast real-time)
        /// </summary>
        public async Task SendMessage(string conversationId, object messageData)
        {
            try
            {
                // Extract userId from JWT token
                var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    await Clients.Caller.SendAsync("Error", "Invalid authentication");
                    _logger.LogWarning($"Invalid userId for SendMessage in group {conversationId}");
                    return;
                }

                // Parse messageData to DTO
                var jsonString = messageData?.ToString();
                if (string.IsNullOrEmpty(jsonString))
                {
                    await Clients.Caller.SendAsync("Error", "Empty message data");
                    return;
                }
                
                var dto = JsonSerializer.Deserialize<SendGroupMessageDto>(jsonString);
                
                if (dto == null)
                {
                    await Clients.Caller.SendAsync("Error", "Invalid message data");
                    return;
                }

                // Override userId from token (bảo mật - không tin client)
                dto.UserId = userId;
                dto.ConversationId = int.Parse(conversationId);

                // ✅ LƯU VÀO DATABASE qua GroupMessageService
                var savedMessage = await _messageService.SendMessageAsync(dto);

                // Prepare payload and include ClientTempId (if provided) so clients can reconcile optimistic UI
                var payload = new
                {
                    id = savedMessage.MessageId, // ID thật từ database
                    userId = savedMessage.UserId,
                    userName = savedMessage.UserName,
                    userAvatar = savedMessage.UserAvatar,
                    content = savedMessage.Content,
                    messageType = savedMessage.MessageType,
                    fileUrl = savedMessage.FileUrl,
                    timestamp = savedMessage.CreatedAt,
                    replyTo = savedMessage.ReplyTo, // Thông tin tin nhắn được reply
                    reactions = savedMessage.Reactions,
                    readBy = savedMessage.ReadBy,
                    clientTempId = dto?.ClientTempId
                };

                // ✅ BROADCAST chỉ khi lưu DB thành công
                await Clients.Group(conversationId).SendAsync("ReceiveMessage", payload);

                _logger.LogInformation($"User {userId} sent message {savedMessage.MessageId} to group {conversationId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending message to group {conversationId}: {ex.Message}");

                // If messageData included a clientTempId, notify caller to remove the optimistic message
                try
                {
                    var jsonString2 = messageData?.ToString();
                    if (!string.IsNullOrEmpty(jsonString2))
                    {
                        var parsed = JsonSerializer.Deserialize<SendGroupMessageDto>(jsonString2);
                        if (parsed?.ClientTempId != null)
                        {
                            await Clients.Caller.SendAsync("MessageSaveFailed", new { clientTempId = parsed.ClientTempId, error = ex.Message });
                        }
                        else
                        {
                            await Clients.Caller.SendAsync("Error", $"Không thể gửi tin nhắn: {ex.Message}");
                        }
                    }
                    else
                    {
                        await Clients.Caller.SendAsync("Error", $"Không thể gửi tin nhắn: {ex.Message}");
                    }
                }
                catch
                {
                    await Clients.Caller.SendAsync("Error", $"Không thể gửi tin nhắn: {ex.Message}");
                }
            }
        }

        /// <summary>
        /// Đánh dấu tin nhắn đã đọc (read receipt) - broadcast real-time
        /// </summary>
        public async Task MarkMessageAsRead(string conversationId, int messageId)
        {
            try
            {
                var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    _logger.LogWarning($"Invalid userId for MarkMessageAsRead");
                    return;
                }

                // ✅ LƯU VÀO DATABASE
                await _messageService.MarkAsReadAsync(messageId, userId);

                // ✅ BROADCAST read receipt đến tất cả members
                await Clients.Group(conversationId).SendAsync("MessageRead", new
                {
                    messageId,
                    userId,
                    readAt = DateTime.UtcNow
                });

                _logger.LogInformation($"User {userId} marked message {messageId} as read");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error marking message as read: {ex.Message}");
            }
        }

        /// <summary>
        /// User vừa mở group (OpenGroup) - bulk mark messages as read up to lastReadMessageId
        /// Client should call this when user opens the conversation to reset unreadCount quickly.
        /// </summary>
        public async Task OpenGroup(string conversationId, int lastReadMessageId)
        {
            try
            {
                var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    _logger.LogWarning("Invalid userId for OpenGroup");
                    return;
                }

                var convId = int.Parse(conversationId);

                // Persist bulk read (best-effort)
                await _messageService.OpenGroupAsync(convId, userId, lastReadMessageId);

                // Broadcast a small payload so clients can reset unread counters and update lastRead mapping
                await Clients.Group(conversationId).SendAsync("MessageRead", new
                {
                    conversationId = convId,
                    userId = userId,
                    lastReadMessageId = lastReadMessageId,
                    readAt = DateTime.UtcNow
                });

                _logger.LogInformation($"User {userId} opened group {conversationId}, marked up to {lastReadMessageId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in OpenGroup for {conversationId}: {ex.Message}");
            }
        }

        /// <summary>
        /// Thêm reaction vào tin nhắn - broadcast real-time
        /// </summary>
        public async Task ReactToMessage(string conversationId, int messageId, string emoji)
        {
            try
            {
                var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    _logger.LogWarning($"Invalid userId for ReactToMessage");
                    return;
                }

                // ✅ LƯU VÀO DATABASE
                var dto = new AddReactionDto { MessageId = messageId, UserId = userId, Emoji = emoji };
                var updatedMessage = await _messageService.AddReactionAsync(dto);

                // ✅ BROADCAST reaction update đến tất cả members
                await Clients.Group(conversationId).SendAsync("ReactionAdded", new
                {
                    messageId,
                    userId,
                    emoji,
                    reactions = updatedMessage.Reactions // Full reactions dict
                });

                _logger.LogInformation($"User {userId} reacted {emoji} to message {messageId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error adding reaction: {ex.Message}");
            }
        }

        /// <summary>
        /// Cập nhật avatar nhóm
        /// </summary>
        public async Task UpdateGroupAvatar(string conversationId, string avatarUrl)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                _logger.LogInformation($"User {userId} updating avatar for group {conversationId}");

                // Broadcast đến tất cả thành viên
                await Clients.Group(conversationId).SendAsync("GroupAvatarUpdated", new
                {
                    conversationId,
                    avatarUrl,
                    updatedBy = userId,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating group avatar {conversationId}");
                throw;
            }
        }

        /// <summary>
        /// Cập nhật tên nhóm (broadcast)
        /// </summary>
        public async Task UpdateGroupName(string conversationId, string newName)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                _logger.LogInformation($"User {userId} updating name for group {conversationId}");

                // Broadcast đến tất cả thành viên
                // Try to persist the change server-side so hub fallback also persists
                if (!string.IsNullOrEmpty(userId) && int.TryParse(userId, out int uid))
                {
                    try
                    {
                        var convId = int.Parse(conversationId);
                        var (success, error) = await _groupChatService.UpdateGroupNameAsync(convId, newName, uid);
                        if (!success)
                        {
                            // Notify caller about failure
                            await Clients.Caller.SendAsync("Error", $"Không thể cập nhật tên nhóm: {error}");
                            return;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error persisting group name change from hub");
                        await Clients.Caller.SendAsync("Error", $"Không thể cập nhật tên nhóm: {ex.Message}");
                        return;
                    }
                }

                await Clients.Group(conversationId).SendAsync("GroupNameUpdated", new
                {
                    conversationId,
                    newName,
                    updatedBy = userId,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating group name {conversationId}");
                throw;
            }
        }

        /// <summary>
        /// Ghim tin nhắn
        /// </summary>
        public async Task PinMessage(string conversationId, int messageId, object messageData)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                _logger.LogInformation($"User {userId} pinning message {messageId} in group {conversationId}");

                // Broadcast đến tất cả thành viên
                // Try to persist pin in database via service
                if (int.TryParse(userId, out int pinnedBy))
                {
                    try
                    {
                        var convId = int.Parse(conversationId);
                        var (success, error, messageDto) = await _messageService.PinMessageAsync(convId, messageId, pinnedBy);
                        if (success)
                        {
                            await Clients.Group(conversationId).SendAsync("MessagePinned", new
                            {
                                conversationId,
                                messageId,
                                message = messageDto,
                                pinnedBy = pinnedBy,
                                timestamp = DateTime.UtcNow
                            });
                        }
                        else
                        {
                            // Notify caller about failure
                            await Clients.Caller.SendAsync("Error", $"Không thể ghim tin nhắn: {error}");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error persisting pin");
                        await Clients.Caller.SendAsync("Error", $"Không thể ghim tin nhắn: {ex.Message}");
                    }
                }
                else
                {
                    await Clients.Caller.SendAsync("Error", "Invalid user for pin action");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error pinning message in group {conversationId}");
                throw;
            }
        }

        /// <summary>
        /// Bỏ ghim tin nhắn
        /// </summary>
        public async Task UnpinMessage(string conversationId, int messageId)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                _logger.LogInformation($"User {userId} unpinning message {messageId} in group {conversationId}");

                // Broadcast đến tất cả thành viên
                if (int.TryParse(userId, out int uid))
                {
                    try
                    {
                        var convId = int.Parse(conversationId);
                        var (success, error) = await _messageService.UnpinMessageAsync(convId, messageId, uid);
                        if (success)
                        {
                            await Clients.Group(conversationId).SendAsync("MessageUnpinned", new
                            {
                                conversationId,
                                messageId,
                                unpinnedBy = uid,
                                timestamp = DateTime.UtcNow
                            });
                        }
                        else
                        {
                            await Clients.Caller.SendAsync("Error", $"Không thể bỏ ghim: {error}");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error persisting unpin");
                        await Clients.Caller.SendAsync("Error", $"Không thể bỏ ghim: {ex.Message}");
                    }
                }
                else
                {
                    await Clients.Caller.SendAsync("Error", "Invalid user for unpin action");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error unpinning message in group {conversationId}");
                throw;
            }
        }

        /// <summary>
        /// Typing indicator
        /// </summary>
        public async Task UserTyping(string conversationId, string username)
        {
            try
            {
                // Gửi cho tất cả trừ người đang typing
                await Clients.OthersInGroup(conversationId).SendAsync("UserTyping", new
                {
                    conversationId,
                    username,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error broadcasting typing indicator");
            }
        }

        /// <summary>
        /// Stop typing indicator
        /// </summary>
        public async Task UserStoppedTyping(string conversationId, string username)
        {
            try
            {
                await Clients.OthersInGroup(conversationId).SendAsync("UserStoppedTyping", new
                {
                    conversationId,
                    username
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error broadcasting stop typing indicator");
            }
        }

        /// <summary>
        /// Xóa tin nhắn
        /// </summary>
        public async Task DeleteMessage(string conversationId, int messageId)
        {
            try
            {
                var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                await Clients.Group(conversationId).SendAsync("MessageDeleted", new
                {
                    conversationId,
                    messageId,
                    deletedBy = userId,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error broadcasting message deletion");
            }
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            _logger.LogInformation($"Client connected: {Context.ConnectionId}, User: {userId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var connectionId = Context.ConnectionId;

            _logger.LogInformation($"Client disconnected: {connectionId}, User: {userId}");

            // Cleanup connections
            lock (_groupConnections)
            {
                foreach (var group in _groupConnections.ToList())
                {
                    group.Value.Remove(connectionId);
                    if (group.Value.Count == 0)
                    {
                        _groupConnections.Remove(group.Key);
                    }
                }
            }

            _userConnections.Remove(connectionId);

            await base.OnDisconnectedAsync(exception);
        }
    }
}
