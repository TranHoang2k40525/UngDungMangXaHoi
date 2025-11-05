using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface INotificationService
    {
        Task SendNotificationAsync(string userId, string message);
        Task SendMentionNotificationAsync(int mentionedUserId, string mentionerUsername, int postId, int commentId);
    }
}