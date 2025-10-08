using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface INotificationService
    {
        Task SendNotificationAsync(string userId, string message);
    }
}