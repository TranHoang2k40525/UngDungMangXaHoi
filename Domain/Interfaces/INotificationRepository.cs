using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface INotificationRepository
    {
        Task<Notification?> GetByIdAsync(int notificationId);
        Task<List<Notification>> GetByUserIdAsync(int userId, int skip = 0, int take = 20);
        Task<List<Notification>> GetUnreadByUserIdAsync(int userId);
        Task<int> GetUnreadCountByUserIdAsync(int userId);
        Task<Notification> AddAsync(Notification notification);
        Task MarkAsReadAsync(int notificationId);
        Task MarkAllAsReadAsync(int userId);
        Task DeleteAsync(Notification notification);
    }
}
