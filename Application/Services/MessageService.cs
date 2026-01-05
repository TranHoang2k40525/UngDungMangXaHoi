using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Application.Services
{
    public class MessageService
    {
        private readonly IMessageRepository _messageRepository;
        private readonly IConversationRepository _conversationRepository;
        private readonly IUserRepository _userRepository;
        private readonly AppDbContext _context;

        public MessageService(
            IMessageRepository messageRepository,
            IConversationRepository conversationRepository,
            IUserRepository userRepository,
            AppDbContext context)
        {
            _messageRepository = messageRepository;
            _conversationRepository = conversationRepository;
            _userRepository = userRepository;
            _context = context;
        }

        // Lấy danh sách conversations của user (không cần follow requirement)
        public async Task<List<ConversationDto>> GetUserConversationsAsync(int userId)
        {
            var conversations = await _conversationRepository.GetUserConversationsAsync(userId);
            var result = new List<ConversationDto>();

            foreach (var conv in conversations)
            {
                var otherUser = conv.user1_id == userId ? conv.User2 : conv.User1;
                var lastMessage = await _messageRepository.GetLastMessageAsync(conv.conversation_id);
                var unreadCount = await _messageRepository.GetUnreadCountAsync(conv.conversation_id, userId);

                // Không cần check mutual follow - bất kỳ ai cũng có thể nhắn tin
                result.Add(new ConversationDto
                {
                    conversation_id = conv.conversation_id,
                    other_user_id = otherUser.user_id,
                    other_user_username = otherUser.username.Value,
                    other_user_full_name = otherUser.full_name,
                    other_user_avatar_url = otherUser.avatar_url?.Value,
                    other_user_bio = otherUser.bio,
                    other_user_last_seen = otherUser.last_seen,
                    last_message = lastMessage != null ? MapToMessageDto(lastMessage) : null,
                    unread_count = unreadCount,
                    created_at = conv.created_at,
                    updated_at = conv.updated_at
                });
            }

            return result.OrderByDescending(c => c.updated_at ?? c.created_at).ToList();
        }

        // Lấy chi tiết conversation và messages
        public async Task<ConversationDetailDto?> GetConversationDetailAsync(int userId, int otherUserId, int page = 1, int pageSize = 50)
        {
            // Không cần check follow - bất kỳ ai cũng có thể nhắn tin cho nhau
            Console.WriteLine($"[MessageService] GetConversationDetail - User {userId} with User {otherUserId}");

            // CRITICAL: Check if other user exists BEFORE creating conversation
            var otherUser = await _userRepository.GetByIdAsync(otherUserId);
            if (otherUser == null)
            {
                Console.WriteLine($"[MessageService] Other user {otherUserId} not found!");
                return null;
            }

            var conversation = await _conversationRepository.GetConversationBetweenUsersAsync(userId, otherUserId);
            
            if (conversation == null)
            {
                // Tạo conversation mới nếu chưa có (sau khi đã verify user exists)
                Console.WriteLine($"[MessageService] Creating new conversation between {userId} and {otherUserId}");
                conversation = await _conversationRepository.CreateAsync(new Conversation
                {
                    user1_id = userId,
                    user2_id = otherUserId,
                    created_at = DateTime.UtcNow
                });
            }

            // Page 1 = tin mới nhất (OrderByDescending)
            var messages = await _messageRepository.GetConversationMessagesAsync(conversation.conversation_id, page, pageSize);
            
            // Đếm tổng số tin nhắn
            var totalMessages = await _context.MessagesNew
                .Where(m => m.conversation_id == conversation.conversation_id && !m.is_deleted)
                .CountAsync();

            // Đánh dấu đã đọc
            await _messageRepository.MarkAsReadAsync(conversation.conversation_id, userId);

            return new ConversationDetailDto
            {
                conversation_id = conversation.conversation_id,
                other_user_id = otherUser.user_id,
                other_user_username = otherUser.username.Value,
                other_user_full_name = otherUser.full_name,
                other_user_avatar_url = otherUser.avatar_url?.Value,
                other_user_bio = otherUser.bio,
                messages = messages.Select(MapToMessageDto).ToList(),
                total_messages = totalMessages,
                page = page,
                page_size = pageSize
            };
        }

        // Gửi tin nhắn
        public async Task<MessageDto?> SendMessageAsync(int senderId, SendMessageDto dto)
        {
            // Không cần check follow - bất kỳ ai cũng có thể nhắn tin cho nhau
            Console.WriteLine($"[MessageService] SendMessage - From User {senderId} to User {dto.receiver_id}");

            var conversation = await _conversationRepository.GetConversationBetweenUsersAsync(senderId, dto.receiver_id);
            
            if (conversation == null)
            {
                conversation = await _conversationRepository.CreateAsync(new Conversation
                {
                    user1_id = senderId,
                    user2_id = dto.receiver_id,
                    created_at = DateTime.UtcNow
                });
            }

            var message = new Message
            {
                conversation_id = conversation.conversation_id,
                sender_id = senderId,
                content = dto.content,
                message_type = Enum.Parse<MessageType>(dto.message_type, true),
                media_url = dto.media_url,
                thumbnail_url = dto.thumbnail_url,
                created_at = DateTime.UtcNow
            };

            var createdMessage = await _messageRepository.CreateAsync(message);
            
            // Cập nhật updated_at của conversation
            await _conversationRepository.UpdateAsync(conversation);

            return MapToMessageDto(createdMessage);
        }

        // Đánh dấu đã đọc
        public async Task MarkAsReadAsync(int conversationId, int userId)
        {
            await _messageRepository.MarkAsReadAsync(conversationId, userId);
        }

        // Xóa tin nhắn
        public async Task<bool> DeleteMessageAsync(int messageId, int userId)
        {
            var message = await _messageRepository.GetByIdAsync(messageId);
            if (message == null || message.sender_id != userId)
                return false;

            await _messageRepository.DeleteAsync(messageId);
            return true;
        }

        // Kiểm tra mutual follow (theo dõi lẫn nhau)
        private async Task<bool> CheckMutualFollowAsync(int userId1, int userId2)
        {
            var follow1 = await _context.Follows
                .AnyAsync(f => f.follower_id == userId1 && f.following_id == userId2);
            
            var follow2 = await _context.Follows
                .AnyAsync(f => f.follower_id == userId2 && f.following_id == userId1);

            return follow1 && follow2;
        }

        // Lấy danh sách users có thể nhắn tin (mutual followers) với last message và unread count
        public async Task<List<ConversationDto>> GetMutualFollowersAsync(int userId)
        {
            Console.WriteLine($"[MessageService] GetMutualFollowersAsync - userId: {userId}");
            
            // Simpler and more robust mutual follow detection:
            // - get users that 'userId' follows
            // - keep those where the other user also follows 'userId'
            var followingIds = await _context.Follows
                .Where(f => f.follower_id == userId)
                .Select(f => f.following_id)
                .Distinct()
                .ToListAsync();

            Console.WriteLine($"[MessageService] Found {followingIds.Count} users that userId {userId} follows: [{string.Join(", ", followingIds)}]");

            var conversations = new List<ConversationDto>();
            foreach (var otherId in followingIds)
            {
                // Bỏ qua chính mình
                if (otherId == userId)
                {
                    Console.WriteLine($"[MessageService] Skipping self (userId {userId})");
                    continue;
                }

                var isFollowBack = await _context.Follows
                    .AnyAsync(f => f.follower_id == otherId && f.following_id == userId);

                Console.WriteLine($"[MessageService] Checking if user {otherId} follows back user {userId}: {isFollowBack}");

                if (!isFollowBack)
                    continue;

                var user = await _userRepository.GetByIdAsync(otherId);
                Console.WriteLine($"[MessageService] User {otherId} found in repository: {user != null}");
                
                if (user != null)
                {
                    // Convert last_seen từ UTC sang Vietnam time
                    var vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
                    DateTime? lastSeenVietnam = user.last_seen.HasValue 
                        ? TimeZoneInfo.ConvertTimeFromUtc(user.last_seen.Value, vietnamTimeZone) 
                        : null;

                    // Lấy tin nhắn gần nhất giữa 2 users
                    // Tìm conversation giữa userId và otherId
                    var conversation = await _context.ConversationsNew
                        .FirstOrDefaultAsync(c => 
                            (c.user1_id == userId && c.user2_id == otherId) || 
                            (c.user1_id == otherId && c.user2_id == userId));

                    MessageDto? lastMessageDto = null;
                    int unreadCount = 0;

                    if (conversation != null)
                    {
                        // Lấy tin nhắn gần nhất trong conversation
                        var lastMessage = await _context.MessagesNew
                            .Include(m => m.Sender)
                                .ThenInclude(s => s.Account)
                            .Where(m => m.conversation_id == conversation.conversation_id)
                            .OrderByDescending(m => m.created_at)
                            .FirstOrDefaultAsync();

                        if (lastMessage != null)
                        {
                            lastMessageDto = MapToMessageDto(lastMessage);
                        }

                        // Đếm số tin nhắn chưa đọc từ otherId gửi cho userId
                        unreadCount = await _context.MessagesNew
                            .Where(m => m.conversation_id == conversation.conversation_id && 
                                       m.sender_id == otherId && 
                                       m.status != MessageStatus.Read)
                            .CountAsync();
                    }

                    conversations.Add(new ConversationDto
                    {
                        conversation_id = conversation?.conversation_id ?? 0,
                        other_user_id = user.user_id,
                        other_user_username = user.username.Value,
                        other_user_full_name = user.full_name,
                        other_user_avatar_url = user.avatar_url?.Value,
                        other_user_bio = user.bio,
                        other_user_last_seen = lastSeenVietnam, // Thêm last_seen
                        last_message = lastMessageDto,
                        unread_count = unreadCount,
                        created_at = DateTime.UtcNow,
                        updated_at = DateTime.UtcNow
                    });
                }
            }

            Console.WriteLine($"[MessageService] Final mutual followers count: {conversations.Count}");
            return conversations;
        }

        // Thu hồi tin nhắn
        public async Task<MessageDto?> RecallMessageAsync(int messageId, int userId)
        {
            Console.WriteLine($"[MessageService] RecallMessage - messageId: {messageId}, userId: {userId}");
            
            var message = await _context.MessagesNew
                .Include(m => m.Sender)
                    .ThenInclude(s => s.Account)
                .FirstOrDefaultAsync(m => m.message_id == messageId);

            if (message == null)
            {
                Console.WriteLine($"[MessageService] Message not found");
                return null;
            }

            // Chỉ người gửi mới được thu hồi
            if (message.sender_id != userId)
            {
                Console.WriteLine($"[MessageService] User not authorized to recall this message");
                return null;
            }

            // Đánh dấu đã thu hồi
            message.is_recalled = true;
            message.content = "Tin nhắn đã bị thu hồi"; // Thay đổi content
            message.updated_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            Console.WriteLine($"[MessageService] Message recalled successfully");

            return MapToMessageDto(message);
        }

        private MessageDto MapToMessageDto(Message message)
        {
            // Convert UTC to Vietnam timezone (UTC+7)
            var vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            var vietnamTime = TimeZoneInfo.ConvertTimeFromUtc(message.created_at, vietnamTimeZone);
            DateTime? readAtVietnam = message.read_at.HasValue 
                ? TimeZoneInfo.ConvertTimeFromUtc(message.read_at.Value, vietnamTimeZone) 
                : null;

            return new MessageDto
            {
                message_id = message.message_id,
                conversation_id = message.conversation_id,
                sender_id = message.sender_id,
                content = message.content,
                message_type = message.message_type.ToString(),
                status = message.status.ToString(),
                media_url = message.media_url,
                thumbnail_url = message.thumbnail_url,
                is_recalled = message.is_recalled, // Thêm is_recalled
                created_at = vietnamTime, // Vietnam time instead of UTC
                read_at = readAtVietnam,
                sender_username = message.Sender.username.Value,
                sender_full_name = message.Sender.full_name,
                sender_avatar_url = message.Sender.avatar_url?.Value
            };
        }
    }
}
