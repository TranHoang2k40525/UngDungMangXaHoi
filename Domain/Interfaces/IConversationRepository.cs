using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IConversationRepository
    {
        Task<Conversation?> GetByIdAsync(int conversationId);
        Task<Conversation?> GetConversationBetweenUsersAsync(int userId1, int userId2);
        Task<List<Conversation>> GetUserConversationsAsync(int userId);
        Task<Conversation> CreateAsync(Conversation conversation);
        Task UpdateAsync(Conversation conversation);
        Task<bool> ExistsAsync(int conversationId);
    }
}
