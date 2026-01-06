using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class GroupConversationRepository : IGroupConversationRepository
    {
        private readonly AppDbContext _context;

        public GroupConversationRepository(AppDbContext context)
        {
            _context = context;
        }

    public async Task<GroupConversation?> GetByIdAsync(int conversationId)
        {
            return await _context.Conversations
        .FirstOrDefaultAsync(c => c.conversation_id == conversationId);
        }

        public async Task<GroupConversation?> GetByIdWithMembersAsync(int conversationId)
        {
            return await _context.Conversations
                .Include(c => c.Members)
                .ThenInclude(m => m.User)
                .FirstOrDefaultAsync(c => c.conversation_id == conversationId);
        }

    public async Task<GroupConversationMember?> GetMemberAsync(int conversationId, int userId)
        {
            return await _context.ConversationMembers
        .FirstOrDefaultAsync(cm => cm.conversation_id == conversationId && cm.user_id == userId);
        }

        public async Task<List<GroupConversationMember>> GetAllMembersAsync(int conversationId)
        {
            return await _context.ConversationMembers
                .Include(cm => cm.User)
                .Where(cm => cm.conversation_id == conversationId)
                .ToListAsync();
        }

        public async Task<int> GetMemberCountAsync(int conversationId)
        {
            return await _context.ConversationMembers
                .CountAsync(cm => cm.conversation_id == conversationId);
        }

        public async Task<bool> IsMemberAsync(int conversationId, int userId)
        {
            return await _context.ConversationMembers
                .AnyAsync(cm => cm.conversation_id == conversationId && cm.user_id == userId);
        }

        public async Task<bool> IsAdminAsync(int conversationId, int userId)
        {
            return await _context.ConversationMembers
                .AnyAsync(cm => cm.conversation_id == conversationId 
                               && cm.user_id == userId 
                               && cm.role == "admin");
        }

        public async Task AddMemberAsync(GroupConversationMember member)
        {
            _context.ConversationMembers.Add(member);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveMemberAsync(int conversationId, int userId)
        {
            var member = await GetMemberAsync(conversationId, userId);
            if (member != null)
            {
                _context.ConversationMembers.Remove(member);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<GroupConversation> CreateAsync(GroupConversation conversation)
        {
            _context.Conversations.Add(conversation);
            await _context.SaveChangesAsync();
            return conversation;
        }

        public async Task UpdateAsync(GroupConversation conversation)
        {
            _context.Conversations.Update(conversation);
            await _context.SaveChangesAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        public async Task DeleteConversationAsync(int conversationId)
        {
            // Remove messages
            var msgs = _context.Messages.Where(m => m.conversation_id == conversationId);
            _context.Messages.RemoveRange(msgs);

            // Remove members
            var members = _context.ConversationMembers.Where(cm => cm.conversation_id == conversationId);
            _context.ConversationMembers.RemoveRange(members);

            // Remove conversation
            var conv = await _context.Conversations.FirstOrDefaultAsync(c => c.conversation_id == conversationId);
            if (conv != null)
            {
                _context.Conversations.Remove(conv);
            }

            await _context.SaveChangesAsync();
        }

        public async Task UpdateMemberRoleAsync(int conversationId, int userId, string role)
        {
            var member = await GetMemberAsync(conversationId, userId);
            if (member != null)
            {
                member.role = role;
                _context.ConversationMembers.Update(member);
                await _context.SaveChangesAsync();
            }
        }

        public async Task UpdateMemberLastReadAsync(int conversationId, int userId, int lastReadMessageId)
        {
            var member = await GetMemberAsync(conversationId, userId);
            if (member != null)
            {
                // ✅ FIX: Validate message exists before updating foreign key
                var messageExists = await _context.Messages
                    .AnyAsync(m => m.message_id == lastReadMessageId && m.conversation_id == conversationId);
                
                if (!messageExists)
                {
                    Console.WriteLine($"[GroupConversationRepo] Warning: Message {lastReadMessageId} not found in conversation {conversationId}, skipping last_read update");
                    return;
                }

                member.last_read_message_id = lastReadMessageId;
                member.last_read_at = DateTime.UtcNow;
                _context.ConversationMembers.Update(member);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<List<GroupConversation>> GetUserGroupsAsync(int userId)
        {
            return await _context.ConversationMembers
                .Where(cm => cm.user_id == userId)
                .Include(cm => cm.Conversation)
                .ThenInclude(c => c.Members)
                .ThenInclude(m => m.User)
                .Where(cm => cm.Conversation.is_group == true)
                .Select(cm => cm.Conversation)
                .OrderByDescending(c => c.created_at)
                .ToListAsync();
        }
    }
}
