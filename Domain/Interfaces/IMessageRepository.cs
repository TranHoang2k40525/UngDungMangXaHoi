using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IMessageRepository
    {
        Task<Message?> GetByIdAsync(int messageId);
        Task<List<Message>> GetConversationMessagesAsync(int conversationId, int pageNumber = 1, int pageSize = 50);
        Task<Message?> GetLastMessageAsync(int conversationId);
        Task<Message> CreateAsync(Message message);
        Task UpdateAsync(Message message);
        Task DeleteAsync(int messageId);
        Task<int> GetUnreadCountAsync(int conversationId, int userId);
        Task MarkAsReadAsync(int conversationId, int userId);
    }
}
