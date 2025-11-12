using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class ConversationRepository : IConversationRepository
    {
        private readonly AppDbContext _context;

        public ConversationRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Conversation?> GetByIdAsync(int conversationId)
        {
            return await _context.ConversationsNew
                .Include(c => c.User1)
                .Include(c => c.User2)
                .FirstOrDefaultAsync(c => c.conversation_id == conversationId);
        }

        public async Task<Conversation?> GetConversationBetweenUsersAsync(int userId1, int userId2)
        {
            return await _context.ConversationsNew
                .Include(c => c.User1)
                .Include(c => c.User2)
                .FirstOrDefaultAsync(c =>
                    (c.user1_id == userId1 && c.user2_id == userId2) ||
                    (c.user1_id == userId2 && c.user2_id == userId1));
        }

        public async Task<List<Conversation>> GetUserConversationsAsync(int userId)
        {
            return await _context.ConversationsNew
                .Include(c => c.User1)
                .Include(c => c.User2)
                .Where(c => c.user1_id == userId || c.user2_id == userId)
                .OrderByDescending(c => c.updated_at ?? c.created_at)
                .ToListAsync();
        }

        public async Task<Conversation> CreateAsync(Conversation conversation)
        {
            conversation.created_at = DateTime.UtcNow;
            conversation.updated_at = DateTime.UtcNow;
            
            _context.ConversationsNew.Add(conversation);
            await _context.SaveChangesAsync();
            
            return await GetByIdAsync(conversation.conversation_id) ?? conversation;
        }

        public async Task UpdateAsync(Conversation conversation)
        {
            conversation.updated_at = DateTime.UtcNow;
            _context.ConversationsNew.Update(conversation);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ExistsAsync(int conversationId)
        {
            return await _context.ConversationsNew
                .AnyAsync(c => c.conversation_id == conversationId);
        }
    }
}
