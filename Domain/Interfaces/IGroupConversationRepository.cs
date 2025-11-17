using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IGroupConversationRepository
    {
        Task<GroupConversation?> GetByIdAsync(int conversationId);
        Task<GroupConversation?> GetByIdWithMembersAsync(int conversationId);
        Task<GroupConversationMember?> GetMemberAsync(int conversationId, int userId);
        Task<List<GroupConversationMember>> GetAllMembersAsync(int conversationId);
        Task<int> GetMemberCountAsync(int conversationId);
        Task<bool> IsMemberAsync(int conversationId, int userId);
        Task<bool> IsAdminAsync(int conversationId, int userId);
        Task AddMemberAsync(GroupConversationMember member);
        Task RemoveMemberAsync(int conversationId, int userId);
        Task<GroupConversation> CreateAsync(GroupConversation conversation);
        Task UpdateAsync(GroupConversation conversation);
        Task SaveChangesAsync();
        Task DeleteConversationAsync(int conversationId);
        Task UpdateMemberRoleAsync(int conversationId, int userId, string role);
        // Update member's last read message id
        Task UpdateMemberLastReadAsync(int conversationId, int userId, int lastReadMessageId);
        Task<List<GroupConversation>> GetUserGroupsAsync(int userId);
    }
}
