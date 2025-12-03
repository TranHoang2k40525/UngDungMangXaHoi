using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    /// <summary>
    /// Service xử lý messages CHỈ CHO GROUP CHAT (conversation.is_group = true)
    /// KHÔNG xử lý chat 1:1
    /// </summary>
    public class GroupMessageService
    {
    private readonly IGroupMessageRepository _messageRepo;
    private readonly IGroupConversationRepository _conversationRepo;
        private readonly IUserRepository _userRepo;
        private readonly INotificationRepository _notificationRepository;
        private readonly IRealTimeNotificationService _realTimeNotificationService;

        public GroupMessageService(
            IGroupMessageRepository messageRepo,
            IGroupConversationRepository conversationRepo,
            IUserRepository userRepo,
            INotificationRepository notificationRepository,
            IRealTimeNotificationService realTimeNotificationService)
        {
            _messageRepo = messageRepo;
            _conversationRepo = conversationRepo;
            _userRepo = userRepo;
            _notificationRepository = notificationRepository;
            _realTimeNotificationService = realTimeNotificationService;
        }

        /// <summary>
        /// Gửi message trong GROUP CHAT
        /// Hỗ trợ: text, số, mixed content
        /// </summary>
        public async Task<GroupMessageDto> SendMessageAsync(SendGroupMessageDto dto)
        {
            // ✅ VALIDATION 1: Check conversation tồn tại VÀ là GROUP CHAT
            var conversation = await _conversationRepo.GetByIdAsync(dto.ConversationId);
            if (conversation == null)
                throw new Exception("Conversation không tồn tại");
            
            if (!conversation.is_group)
                throw new Exception("Service này CHỈ xử lý GROUP CHAT. Conversation này không phải group chat.");

            // ✅ VALIDATION 2: Check user là member của group
            var members = await _conversationRepo.GetAllMembersAsync(dto.ConversationId);
            if (!members.Any(m => m.user_id == dto.UserId))
                throw new Exception("User không phải thành viên của group");

            // ✅ VALIDATION 3: Content không empty (trừ khi có file)
            if (string.IsNullOrWhiteSpace(dto.Content) && string.IsNullOrWhiteSpace(dto.FileUrl))
                throw new Exception("Message không được rỗng");

            // ✅ VALIDATION 4: Nếu reply, check message gốc tồn tại
            if (dto.ReplyToMessageId.HasValue)
            {
                var parentMessage = await _messageRepo.GetMessageByIdAsync(dto.ReplyToMessageId.Value);
                if (parentMessage == null || parentMessage.conversation_id != dto.ConversationId)
                    throw new Exception("Message được reply không hợp lệ");
            }

            // ✅ Tạo entity
            var message = new GroupMessage
            {
                conversation_id = dto.ConversationId,
                user_id = dto.UserId,
                content = dto.Content?.Trim(),
                message_type = dto.MessageType,
                file_url = dto.FileUrl,
                reply_to_message_id = dto.ReplyToMessageId,
                created_at = DateTime.UtcNow,
                is_deleted = false
            };

            // ✅ Lưu vào DB
            var savedMessage = await _messageRepo.AddMessageAsync(message);

            // ✅ Gửi thông báo cho các thành viên khác
            await SendGroupMessageNotificationAsync(dto.ConversationId, dto.UserId, dto.Content ?? "", conversation.name ?? "Nhóm chat", savedMessage.message_id);

                // ✅ Convert sang DTO (for SendMessage: mark as read by sender)
                return await MapToDto(savedMessage, dto.UserId);
        }

        /// <summary>
        /// Lấy danh sách messages của GROUP CHAT với pagination
        /// </summary>
        public async Task<PaginatedGroupMessagesDto> GetMessagesAsync(int conversationId, int userId, int page = 1, int pageSize = 50)
        {
            // ✅ Check conversation là GROUP CHAT
            var conversation = await _conversationRepo.GetByIdAsync(conversationId);
            if (conversation == null || !conversation.is_group)
                throw new Exception("Conversation không phải group chat");

            // ✅ Check user là member
            var members = await _conversationRepo.GetAllMembersAsync(conversationId);
            if (!members.Any(m => m.user_id == userId))
                throw new Exception("User không phải thành viên của group");

            // ✅ Lấy messages
            var messages = await _messageRepo.GetMessagesByConversationIdAsync(conversationId, page, pageSize);
            
            // ✅ Convert sang DTO (set IsReadByMe using the requesting userId)
            var messageDtos = new List<GroupMessageDto>();
            foreach (var msg in messages)
            {
                messageDtos.Add(await MapToDto(msg, userId));
            }

            // ✅ Count total (để tính hasMore)
            // Note: Đơn giản hóa - nếu số message trả về < pageSize thì hết
            var hasMore = messages.Count == pageSize;

            return new PaginatedGroupMessagesDto
            {
                Messages = messageDtos,
                TotalCount = messageDtos.Count, // Simplified
                Page = page,
                PageSize = pageSize,
                HasMore = hasMore
            };
        }

        /// <summary>
        /// Đánh dấu message đã đọc (read receipt)
        /// </summary>
        /// <summary>
        /// Mark message as read and return the conversationId when successful.
        /// Returns null when operation failed.
        /// </summary>
        public async Task<int?> MarkAsReadAsync(int messageId, int userId)
        {
            var message = await _messageRepo.GetMessageByIdAsync(messageId);
            if (message == null)
                throw new Exception("Message không tồn tại");

            // ✅ Check là GROUP CHAT
            var conversation = await _conversationRepo.GetByIdAsync(message.conversation_id);
            if (conversation == null || !conversation.is_group)
                throw new Exception("Message không thuộc group chat");

            // ✅ Check user là member
            var members = await _conversationRepo.GetAllMembersAsync(message.conversation_id);
            if (!members.Any(m => m.user_id == userId))
                throw new Exception("User không phải thành viên của group");

            var ok = await _messageRepo.MarkAsReadAsync(messageId, userId);
            if (!ok) return null;

            // Update ConversationMembers.last_read_message_id and add GroupMessageReads for messages up to this id
            try
            {
                // Update last_read_message_id on conversation member record (if repo supports it)
                try
                {
                    await _conversationRepo.UpdateMemberLastReadAsync(message.conversation_id, userId, messageId);
                }
                catch
                {
                    // If repository does not implement UpdateMemberLastReadAsync, ignore and continue
                }

                // Insert read records for any messages not yet marked as read by this user up to messageId
                try
                {
                    var unreadIds = await _messageRepo.GetUnreadMessageIdsForUserAsync(message.conversation_id, userId, messageId);
                    if (unreadIds != null && unreadIds.Count > 0)
                    {
                        var now = DateTime.UtcNow;
                        await _messageRepo.AddReadsForUserAsync(unreadIds, userId, now);
                    }
                }
                catch
                {
                    // best-effort -- continue even if repository lacks batch helpers
                }
            }
            catch (Exception ex)
            {
                // Log via user repo? For now swallow to avoid breaking client flow
                Console.WriteLine("[GroupMessageService] MarkAsRead post-processing failed: " + ex.Message);
            }

            return message.conversation_id;
        }

        /// <summary>
        /// Handle OpenGroup (user opens the conversation) - bulk mark read up to lastReadMessageId.
        /// This updates ConversationMembers.last_read_message_id and inserts GroupMessageReads for unread messages.
        /// Returns conversationId on success.
        /// </summary>
        public async Task<int?> OpenGroupAsync(int conversationId, int userId, int lastReadMessageId)
        {
            // Validate conversation and membership
            var conversation = await _conversationRepo.GetByIdAsync(conversationId);
            if (conversation == null || !conversation.is_group)
                throw new Exception("Conversation không hợp lệ");

            var members = await _conversationRepo.GetAllMembersAsync(conversationId);
            if (!members.Any(m => m.user_id == userId))
                throw new Exception("User không phải thành viên của group");

            // Update member last_read_message_id
            try
            {
                await _conversationRepo.UpdateMemberLastReadAsync(conversationId, userId, lastReadMessageId);
            }
            catch
            {
                // ignore if repo doesn't implement
            }

            // Batch-insert read records for messages <= lastReadMessageId that weren't read
            try
            {
                var unreadIds = await _messageRepo.GetUnreadMessageIdsForUserAsync(conversationId, userId, lastReadMessageId);
                if (unreadIds != null && unreadIds.Count > 0)
                {
                    var now = DateTime.UtcNow;
                    await _messageRepo.AddReadsForUserAsync(unreadIds, userId, now);
                }
            }
            catch
            {
                // best-effort
            }

            return conversationId;
        }

        /// <summary>
        /// Thêm/Update reaction cho message
        /// </summary>
        public async Task<GroupMessageDto> AddReactionAsync(AddReactionDto dto)
        {
            var message = await _messageRepo.GetMessageByIdAsync(dto.MessageId);
            if (message == null)
                throw new Exception("Message không tồn tại");

            // ✅ Check là GROUP CHAT
            var conversation = await _conversationRepo.GetByIdAsync(message.conversation_id);
            if (conversation == null || !conversation.is_group)
                throw new Exception("Message không thuộc group chat");

            // ✅ Check user là member
            var members = await _conversationRepo.GetAllMembersAsync(message.conversation_id);
            if (!members.Any(m => m.user_id == dto.UserId))
                throw new Exception("User không phải thành viên của group");

            // ✅ Add reaction
            await _messageRepo.AddReactionAsync(dto.MessageId, dto.UserId, dto.Emoji);

            // ✅ Reload message
            var updatedMessage = await _messageRepo.GetMessageByIdAsync(dto.MessageId);
            return await MapToDto(updatedMessage!);
        }

        /// <summary>
        /// Xóa reaction của user
        /// </summary>
        public async Task<GroupMessageDto> RemoveReactionAsync(int messageId, int userId, string emoji)
        {
            var message = await _messageRepo.GetMessageByIdAsync(messageId);
            if (message == null)
                throw new Exception("Message không tồn tại");

            // ✅ Check là GROUP CHAT
            var conversation = await _conversationRepo.GetByIdAsync(message.conversation_id);
            if (conversation == null || !conversation.is_group)
                throw new Exception("Message không thuộc group chat");

            await _messageRepo.RemoveReactionAsync(messageId, userId, emoji);

            var updatedMessage = await _messageRepo.GetMessageByIdAsync(messageId);
            return await MapToDto(updatedMessage!);
        }

        /// <summary>
        /// Lấy thread (replies) của message
        /// </summary>
        public async Task<List<GroupMessageDto>> GetThreadAsync(int parentMessageId, int userId)
        {
            var parentMessage = await _messageRepo.GetMessageByIdAsync(parentMessageId);
            if (parentMessage == null)
                throw new Exception("Message không tồn tại");

            // ✅ Check là GROUP CHAT
            var conversation = await _conversationRepo.GetByIdAsync(parentMessage.conversation_id);
            if (conversation == null || !conversation.is_group)
                throw new Exception("Message không thuộc group chat");

            // ✅ Check user là member
            var members = await _conversationRepo.GetAllMembersAsync(parentMessage.conversation_id);
            if (!members.Any(m => m.user_id == userId))
                throw new Exception("User không phải thành viên của group");

            // ✅ Lấy replies
            var replies = await _messageRepo.GetThreadMessagesAsync(parentMessageId);
            
            var replyDtos = new List<GroupMessageDto>();
            foreach (var reply in replies)
            {
                replyDtos.Add(await MapToDto(reply, userId));
            }

            return replyDtos;
        }

        /// <summary>
        /// Soft delete message
        /// </summary>
        public async Task<bool> DeleteMessageAsync(int messageId, int userId)
        {
            var message = await _messageRepo.GetMessageByIdAsync(messageId);
            if (message == null)
                throw new Exception("Message không tồn tại");

            // ✅ Check là GROUP CHAT
            var conversation = await _conversationRepo.GetByIdAsync(message.conversation_id);
            if (conversation == null || !conversation.is_group)
                throw new Exception("Message không thuộc group chat");

            // ✅ Chỉ cho phép xóa message của chính mình
            if (message.user_id != userId)
                throw new Exception("Bạn chỉ có thể xóa message của mình");

            return await _messageRepo.DeleteMessageAsync(messageId);
        }

        /// <summary>
        /// Pin a message in a group
        /// </summary>
        public async Task<(bool Success, string? ErrorMessage, GroupMessageDto? Message)> PinMessageAsync(int conversationId, int messageId, int userId)
        {
            var conversation = await _conversationRepo.GetByIdAsync(conversationId);
            if (conversation == null || !conversation.is_group)
                return (false, "Conversation không phải group chat", null);

            var members = await _conversationRepo.GetAllMembersAsync(conversationId);
            if (!members.Any(m => m.user_id == userId))
                return (false, "Bạn không phải thành viên của group", null);

            var message = await _messageRepo.GetMessageByIdAsync(messageId);
            if (message == null || message.conversation_id != conversationId)
                return (false, "Message không hợp lệ", null);

            var ok = await _messageRepo.PinMessageAsync(conversationId, messageId, userId);
            if (!ok) return (false, "Không thể ghim tin nhắn", null);

            var updated = await _messageRepo.GetMessageByIdAsync(messageId);
            var dto = await MapToDto(updated!, userId);
            return (true, null, dto);
        }

        /// <summary>
        /// Unpin a pinned message in a group
        /// </summary>
        public async Task<(bool Success, string? ErrorMessage)> UnpinMessageAsync(int conversationId, int messageId, int userId)
        {
            var conversation = await _conversationRepo.GetByIdAsync(conversationId);
            if (conversation == null || !conversation.is_group)
                return (false, "Conversation không phải group chat");

            var members = await _conversationRepo.GetAllMembersAsync(conversationId);
            if (!members.Any(m => m.user_id == userId))
                return (false, "Bạn không phải thành viên của group");

            var message = await _messageRepo.GetMessageByIdAsync(messageId);
            if (message == null || message.conversation_id != conversationId)
                return (false, "Message không hợp lệ");

            var ok = await _messageRepo.UnpinMessageAsync(conversationId, messageId);
            if (!ok) return (false, "Không thể bỏ ghim tin nhắn");

            return (true, null);
        }

        /// <summary>
        /// Get pinned messages for a group
        /// </summary>
        public async Task<(bool Success, string? ErrorMessage, List<GroupMessageDto>? Messages)> GetPinnedMessagesAsync(int conversationId, int userId)
        {
            var conversation = await _conversationRepo.GetByIdAsync(conversationId);
            if (conversation == null || !conversation.is_group)
                return (false, "Conversation không phải group chat", null);

            var members = await _conversationRepo.GetAllMembersAsync(conversationId);
            if (!members.Any(m => m.user_id == userId))
                return (false, "Bạn không phải thành viên của group", null);

            var pinned = await _messageRepo.GetPinnedMessagesAsync(conversationId);
            var dtos = new List<GroupMessageDto>();
            foreach (var m in pinned)
                dtos.Add(await MapToDto(m, userId));

            return (true, null, dtos);
        }

        // ============================================
        // PRIVATE HELPER METHODS
        // ============================================

        /// <summary>
        /// Convert Message entity sang GroupMessageDto (kèm user info, reply info, reactions, read receipts)
        /// </summary>

        public async Task<(bool Success, string? ErrorMessage, List<GroupMessageDto>? Messages)> GetMediaMessagesAsync(int conversationId, int userId, string? mediaType = null)
        {
            var conversation = await _conversationRepo.GetByIdAsync(conversationId);
            if (conversation == null || !conversation.is_group)
                return (false, "Conversation không phải group chat", null);

            var members = await _conversationRepo.GetAllMembersAsync(conversationId);
            if (!members.Any(m => m.user_id == userId))
                return (false, "Bạn không phải thành viên của group", null);

            var media = await _messageRepo.GetMediaMessagesAsync(conversationId, mediaType);
            var dtos = new List<GroupMessageDto>();
            foreach (var m in media)
                dtos.Add(await MapToDto(m, userId));

            return (true, null, dtos);
        }
        private async Task<GroupMessageDto> MapToDto(GroupMessage message, int? currentUserId = null)
        {
            // ✅ Lấy thông tin user
            var user = await _userRepo.GetByIdAsync(message.user_id);
            
            var dto = new GroupMessageDto
            {
                MessageId = message.message_id,
                ConversationId = message.conversation_id,
                UserId = message.user_id,
                UserName = user?.username ?? user?.full_name ?? "Unknown User",
                UserAvatar = user?.avatar_url?.ToString(), // ✅ Fix: Convert ImageUrl to string
                Content = message.content,
                MessageType = message.message_type,
                FileUrl = message.file_url,
                // We'll set CreatedAt/UpdatedAt below after converting to Vietnam timezone
                IsDeleted = message.is_deleted
            };

            // Convert timestamps to Vietnam timezone (UTC+7) for consistent display in client
            try
            {
                // Determine source UTC DateTime
                var createdUtc = message.created_at;
                if (createdUtc.Kind == DateTimeKind.Unspecified)
                    createdUtc = DateTime.SpecifyKind(createdUtc, DateTimeKind.Utc);
                else
                    createdUtc = createdUtc.ToUniversalTime();

                TimeZoneInfo vietNamTz = null!;
                try
                {
                    // Windows ID for Vietnam
                    vietNamTz = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
                }
                catch
                {
                    try
                    {
                        // Linux/macOS IANA
                        vietNamTz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
                    }
                    catch
                    {
                        vietNamTz = TimeZoneInfo.Utc;
                    }
                }

                dto.CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(createdUtc, vietNamTz);

                if (message.updated_at.HasValue)
                {
                    var updatedUtc = message.updated_at.Value;
                    if (updatedUtc.Kind == DateTimeKind.Unspecified)
                        updatedUtc = DateTime.SpecifyKind(updatedUtc, DateTimeKind.Utc);
                    else
                        updatedUtc = updatedUtc.ToUniversalTime();

                    dto.UpdatedAt = TimeZoneInfo.ConvertTimeFromUtc(updatedUtc, vietNamTz);
                }
                else
                {
                    dto.UpdatedAt = null;
                }
            }
            catch
            {
                // Fallback: return raw values if tz conversion fails
                dto.CreatedAt = message.created_at;
                dto.UpdatedAt = message.updated_at;
            }

            // ✅ Parse reply info (nếu có)
            if (message.ReplyToMessage != null)
            {
                var replyUser = await _userRepo.GetByIdAsync(message.ReplyToMessage.user_id);
                dto.ReplyTo = new GroupMessageReplyDto
                {
                    MessageId = message.ReplyToMessage.message_id,
                    UserId = message.ReplyToMessage.user_id,
                    UserName = replyUser?.username ?? replyUser?.full_name ?? "Unknown User",
                    Content = message.ReplyToMessage.content,
                    MessageType = message.ReplyToMessage.message_type,
                    FileUrl = message.ReplyToMessage.file_url
                };
            }

            // ✅ Load reactions and reads from dedicated tables
            try
            {
                var reactions = await _messageRepo.GetReactionsAsync(message.message_id);
                if (reactions != null && reactions.Count > 0)
                {
                    dto.Reactions = reactions
                        .GroupBy(r => r.reaction_type)
                        .ToDictionary(g => g.Key, g => g.Select(x => x.user_id).ToList());
                }
            }
            catch { /* ignore DB read errors */ }

            try
            {
                var reads = await _messageRepo.GetReadsAsync(message.message_id);
                if (reads != null && reads.Count > 0)
                {
                    dto.ReadBy = reads.Select(r => new ReadReceiptDto { UserId = r.user_id, ReadAt = r.read_at }).ToList();
                }
            }
            catch { /* ignore DB read errors */ }

            // Set IsReadByMe if currentUserId provided
            if (currentUserId.HasValue)
            {
                dto.IsReadByMe = dto.ReadBy != null && dto.ReadBy.Any(r => r.UserId == currentUserId.Value);
            }
            else
            {
                dto.IsReadByMe = false;
            }

            return dto;
        }

        // Gửi thông báo tin nhắn nhóm mới
        private async Task SendGroupMessageNotificationAsync(int conversationId, int senderId, string content, string groupName, int messageId)
        {
            try
            {
                var sender = await _userRepo.GetByIdAsync(senderId);
                if (sender == null) return;

                // Lấy danh sách thành viên (trừ người gửi)
                var members = await _conversationRepo.GetAllMembersAsync(conversationId);
                var otherMembers = members.Where(m => m.user_id != senderId).ToList();

                // Tạo preview content
                var previewContent = content?.Length > 50 
                    ? content.Substring(0, 50) + "..." 
                    : content ?? "[Media]";

                // Gửi thông báo cho từng thành viên
                foreach (var member in otherMembers)
                {
                    try
                    {
                        var notification = new Notification
                        {
                            user_id = member.user_id,
                            sender_id = senderId,
                            type = NotificationType.GroupMessage,
                            post_id = null,
                            conversation_id = conversationId,
                            message_id = messageId,
                            content = $"{sender.username.Value} trong nhóm \"{groupName}\": {previewContent}",
                            is_read = false,
                            created_at = DateTimeOffset.UtcNow
                        };

                        await _notificationRepository.AddAsync(notification);

                        // Gửi real-time notification
                        var notificationDto = new NotificationDto
                        {
                            NotificationId = notification.notification_id,
                            UserId = notification.user_id,
                            SenderId = notification.sender_id,
                            SenderUsername = sender.username.Value,
                            SenderAvatar = sender.avatar_url?.Value,
                            Type = notification.type,
                            PostId = null,
                            ConversationId = conversationId,
                            MessageId = messageId,
                            Content = notification.content,
                            IsRead = notification.is_read,
                            CreatedAt = notification.created_at
                        };

                        await _realTimeNotificationService.SendNotificationToUserAsync(member.user_id, notificationDto);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[GroupMessageService] Error sending notification to user {member.user_id}: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GroupMessageService] Error sending group message notifications: {ex.Message}");
            }
        }
    }
}
