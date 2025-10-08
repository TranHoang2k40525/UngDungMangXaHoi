using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    public class NotificationService : INotificationService
    {
        public async Task SendNotificationAsync(string userId, string message)
        {
            // Implement Firebase or other notification logic here
            await Task.CompletedTask; // Placeholder
        }
    }
}