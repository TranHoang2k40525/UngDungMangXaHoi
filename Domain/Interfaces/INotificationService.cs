using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface INotificationService
    {
        Task SendNotificationAsync(Guid userId, string title, string message, string? imageUrl = null);
        Task SendNotificationToMultipleUsersAsync(IEnumerable<Guid> userIds, string title, string message, string? imageUrl = null);
        Task SendFriendRequestNotificationAsync(Guid requesterId, Guid addresseeId);
        Task SendPostLikeNotificationAsync(Guid postAuthorId, Guid likerId, Guid postId);
        Task SendCommentNotificationAsync(Guid postAuthorId, Guid commenterId, Guid postId, Guid commentId);
        Task SendCommentLikeNotificationAsync(Guid commentAuthorId, Guid likerId, Guid commentId);
    }
}

