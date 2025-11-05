using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    /// <summary>
    /// Service để gửi real-time notifications qua SignalR
    /// </summary>
    public interface IRealTimeNotificationService
    {
        Task SendNotificationToUserAsync(int userId, object notification);
        Task SendReactionUpdateAsync(int postOwnerId, object reactionData);
        Task SendShareUpdateAsync(int postOwnerId, object shareData);
    }
}
