using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class MessageRepository : IMessageRepository
    {
        private readonly AppDbContext _context;

        public MessageRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Message?> GetByIdAsync(int messageId)
        {
            return await _context.MessagesNew
                .Include(m => m.Sender)
                .Include(m => m.Conversation)
                .FirstOrDefaultAsync(m => m.message_id == messageId && !m.is_deleted);
        }

        public async Task<List<Message>> GetConversationMessagesAsync(int conversationId, int pageNumber = 1, int pageSize = 50)
        {
            return await _context.MessagesNew
                .Include(m => m.Sender)
                .Where(m => m.conversation_id == conversationId && !m.is_deleted)
                .OrderByDescending(m => m.created_at)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<Message?> GetLastMessageAsync(int conversationId)
        {
            return await _context.MessagesNew
                .Where(m => m.conversation_id == conversationId && !m.is_deleted)
                .OrderByDescending(m => m.created_at)
                .FirstOrDefaultAsync();
        }

        public async Task<Message> CreateAsync(Message message)
        {
            message.created_at = DateTime.UtcNow;
            message.status = MessageStatus.Sent;
            
            _context.MessagesNew.Add(message);
            await _context.SaveChangesAsync();
            
            return await GetByIdAsync(message.message_id) ?? message;
        }

        public async Task UpdateAsync(Message message)
        {
            message.updated_at = DateTime.UtcNow;
            _context.MessagesNew.Update(message);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int messageId)
        {
            var message = await _context.MessagesNew.FindAsync(messageId);
            if (message != null)
            {
                message.is_deleted = true;
                message.updated_at = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<int> GetUnreadCountAsync(int conversationId, int userId)
        {
            return await _context.MessagesNew
                .Where(m => m.conversation_id == conversationId 
                    && m.sender_id != userId 
                    && m.status != MessageStatus.Read
                    && !m.is_deleted)
                .CountAsync();
        }

        public async Task MarkAsReadAsync(int conversationId, int userId)
        {
            var unreadMessages = await _context.MessagesNew
                .Where(m => m.conversation_id == conversationId 
                    && m.sender_id != userId 
                    && m.status != MessageStatus.Read
                    && !m.is_deleted)
                .ToListAsync();

            foreach (var message in unreadMessages)
            {
                message.status = MessageStatus.Read;
                message.read_at = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }
    }
}
