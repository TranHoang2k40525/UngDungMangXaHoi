using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Infrastructure.ExternalServices
{
    public class FirebaseService : INotificationService
    {
        public async Task SendNotificationAsync(string userId, string message)
        {
            // Implement Firebase push notification logic here
            await Task.CompletedTask; // Placeholder
        }
    }
}