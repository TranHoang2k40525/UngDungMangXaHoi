using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Presentation.WebAPI.Hubs
{
    public class SignalRNotificationService : IRealTimeNotificationService
    {
        private readonly IHubContext<NotificationHub> _hubContext;

        public SignalRNotificationService(IHubContext<NotificationHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendNotificationToUserAsync(int userId, object notification)
        {
            await NotificationHub.SendNotificationToUser(_hubContext, userId, notification);
        }

        public async Task SendReactionUpdateAsync(int postOwnerId, object reactionData)
        {
            await NotificationHub.SendReactionUpdate(_hubContext, postOwnerId, reactionData);
        }

        public async Task SendShareUpdateAsync(int postOwnerId, object shareData)
        {
            await NotificationHub.SendShareUpdate(_hubContext, postOwnerId, shareData);
        }
    }
}
