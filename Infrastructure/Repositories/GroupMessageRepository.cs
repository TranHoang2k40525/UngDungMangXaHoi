using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class GroupMessageRepository : IGroupMessageRepository
    {
        private readonly AppDbContext _context;

        public GroupMessageRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<GroupMessage>> GetMessagesByConversationIdAsync(int conversationId, int page = 1, int pageSize = 50)
        {
            var messages = await _context.Set<GroupMessage>()
                .Where(m => m.conversation_id == conversationId && !m.is_deleted)
                .Include(m => m.User) // Lấy thông tin người gửi
                .Include(m => m.ReplyToMessage) // Lấy message được reply (nếu có)
                    .ThenInclude(rm => rm!.User) // Lấy user của replied message
                .OrderByDescending(m => m.created_at) // Mới nhất lên đầu
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Reverse để tin nhắn cũ lên đầu (phù hợp UI chat)
            messages.Reverse();
            return messages;
        }

        public async Task<GroupMessage?> GetMessageByIdAsync(int messageId)
        {
            return await _context.Set<GroupMessage>()
                .Include(m => m.User)
                .Include(m => m.ReplyToMessage)
                    .ThenInclude(rm => rm!.User)
                .FirstOrDefaultAsync(m => m.message_id == messageId && !m.is_deleted);
        }

        public async Task<GroupMessage> AddMessageAsync(GroupMessage message)
        {
            message.created_at = DateTime.UtcNow;
            await _context.Set<GroupMessage>().AddAsync(message);
            await _context.SaveChangesAsync();
            
            // Reload với navigation properties
            return await GetMessageByIdAsync(message.message_id) ?? message;
        }

        public async Task<bool> UpdateMessageAsync(GroupMessage message)
        {
            message.updated_at = DateTime.UtcNow;
            _context.Set<GroupMessage>().Update(message);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> DeleteMessageAsync(int messageId)
        {
            var message = await _context.Set<GroupMessage>().FindAsync(messageId);
            if (message == null) return false;

            message.is_deleted = true;
            message.updated_at = DateTime.UtcNow;
            _context.Set<GroupMessage>().Update(message);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> MarkAsReadAsync(int messageId, int userId)
        {
            // Use MessageReads table instead of JSON field
            var existing = await _context.Set<GroupMessageRead>().FindAsync(messageId, userId);
            if (existing != null) return true;

            var read = new GroupMessageRead
            {
                message_id = messageId,
                user_id = userId,
                read_at = DateTime.UtcNow
            };
            await _context.Set<GroupMessageRead>().AddAsync(read);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> AddReactionAsync(int messageId, int userId, string emoji)
        {
            // Remove any existing reaction row for this message/user then add the new one
            var existing = await _context.Set<GroupMessageReaction>().FindAsync(messageId, userId);
            if (existing != null)
            {
                _context.Set<GroupMessageReaction>().Remove(existing);
            }

            var reaction = new GroupMessageReaction
            {
                message_id = messageId,
                user_id = userId,
                reaction_type = emoji,
                created_at = DateTime.UtcNow
            };

            await _context.Set<GroupMessageReaction>().AddAsync(reaction);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> RemoveReactionAsync(int messageId, int userId, string emoji)
        {
            var existing = await _context.Set<GroupMessageReaction>().FindAsync(messageId, userId);
            if (existing == null) return false;

            // Only remove if emoji matches (safety)
            if (!string.Equals(existing.reaction_type, emoji, StringComparison.Ordinal))
                return false;

            _context.Set<GroupMessageReaction>().Remove(existing);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<List<GroupMessage>> GetThreadMessagesAsync(int parentMessageId)
        {
            return await _context.Set<GroupMessage>()
                .Where(m => m.reply_to_message_id == parentMessageId && !m.is_deleted)
                .Include(m => m.User)
                .OrderBy(m => m.created_at)
                .ToListAsync();
        }

        public async Task<int> GetUnreadCountAsync(int conversationId, int userId)
        {
            // Count messages in conversation that do not have a read entry for this user
            var totalMessages = await _context.Set<GroupMessage>()
                .Where(m => m.conversation_id == conversationId && !m.is_deleted)
                .Select(m => m.message_id)
                .ToListAsync();

            var readMessageIds = await _context.Set<GroupMessageRead>()
                .Where(r => r.user_id == userId && totalMessages.Contains(r.message_id))
                .Select(r => r.message_id)
                .ToListAsync();

            return totalMessages.Count - readMessageIds.Distinct().Count();
        }

        public async Task<List<GroupMessageReaction>> GetReactionsAsync(int messageId)
        {
            return await _context.Set<GroupMessageReaction>()
                .Where(r => r.message_id == messageId)
                .ToListAsync();
        }

        public async Task<List<GroupMessageRead>> GetReadsAsync(int messageId)
        {
            return await _context.Set<GroupMessageRead>()
                .Where(r => r.message_id == messageId)
                .ToListAsync();
        }

        public async Task<GroupMessage?> GetLastMessageAsync(int conversationId)
        {
            return await _context.Set<GroupMessage>()
                .Where(m => m.conversation_id == conversationId && !m.is_deleted)
                .Include(m => m.User)
                .OrderByDescending(m => m.created_at)
                .FirstOrDefaultAsync();
        }

        public async Task<List<int>> GetUnreadMessageIdsForUserAsync(int conversationId, int userId, int upToMessageId)
        {
            // Messages in conversation with id <= upToMessageId and not deleted
            var candidateIds = await _context.Set<GroupMessage>()
                .Where(m => m.conversation_id == conversationId && !m.is_deleted && m.message_id <= upToMessageId)
                .Select(m => m.message_id)
                .ToListAsync();

            // Exclude those already read by user
            var readIds = await _context.Set<GroupMessageRead>()
                .Where(r => r.user_id == userId && candidateIds.Contains(r.message_id))
                .Select(r => r.message_id)
                .ToListAsync();

            var unread = candidateIds.Except(readIds).ToList();
            return unread;
        }

        public async Task<bool> AddReadsForUserAsync(List<int> messageIds, int userId, DateTime readAt)
        {
            if (messageIds == null || messageIds.Count == 0) return true;

            var toAdd = new List<GroupMessageRead>();
            foreach (var mid in messageIds)
            {
                var exists = await _context.Set<GroupMessageRead>().FindAsync(mid, userId);
                if (exists == null)
                {
                    toAdd.Add(new GroupMessageRead { message_id = mid, user_id = userId, read_at = readAt });
                }
            }

            if (toAdd.Count == 0) return true;

            await _context.Set<GroupMessageRead>().AddRangeAsync(toAdd);
            return await _context.SaveChangesAsync() > 0;
        }

        // Pin a message (group chat only)
        public async Task<bool> PinMessageAsync(int conversationId, int messageId, int pinnedBy)
        {
            var message = await _context.Set<GroupMessage>().FirstOrDefaultAsync(m => m.message_id == messageId && m.conversation_id == conversationId && !m.is_deleted);
            if (message == null) return false;

            message.is_pinned = true;
            message.pinned_at = DateTime.UtcNow;
            message.pinned_by = pinnedBy;
            message.updated_at = DateTime.UtcNow;

            _context.Set<GroupMessage>().Update(message);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> UnpinMessageAsync(int conversationId, int messageId)
        {
            var message = await _context.Set<GroupMessage>().FirstOrDefaultAsync(m => m.message_id == messageId && m.conversation_id == conversationId && !m.is_deleted);
            if (message == null) return false;

            message.is_pinned = false;
            message.pinned_at = null;
            message.pinned_by = null;
            message.updated_at = DateTime.UtcNow;

            _context.Set<GroupMessage>().Update(message);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<List<GroupMessage>> GetPinnedMessagesAsync(int conversationId)
        {
            return await _context.Set<GroupMessage>()
                .Where(m => m.conversation_id == conversationId && m.is_pinned && !m.is_deleted)
                .Include(m => m.User)
                .OrderByDescending(m => m.pinned_at)
                .ToListAsync();
        }

        public async Task<List<GroupMessage>> GetMediaMessagesAsync(int conversationId, string? mediaType = null)
        {
            var query = _context.Set<GroupMessage>()
                .Where(m => m.conversation_id == conversationId && !string.IsNullOrEmpty(m.file_url) && !m.is_deleted)
                .Include(m => m.User)
                .OrderByDescending(m => m.created_at)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(mediaType))
            {
                query = query.Where(m => m.message_type == mediaType);
            }

            return await query.ToListAsync();
        }

        // Helper classes for JSON deserialization
        private class ReadInfo
        {
            public int user_id { get; set; }
            public DateTime read_at { get; set; }
        }
    }
}
