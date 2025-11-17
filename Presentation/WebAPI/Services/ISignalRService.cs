namespace UngDungMangXaHoi.WebAPI.Services
{
    /// <summary>
    /// Interface cho SignalR service để quản lý real-time notifications
    /// </summary>
    public interface ISignalRService
    {
        // Chat methods
        Task SendMessageToGroup(string conversationId, object messageData);
        Task NotifyGroupAvatarUpdate(string conversationId, string avatarUrl, string updatedBy);
        Task NotifyMemberRemoved(string conversationId, string removedUserId, string removedBy);
        Task NotifyGroupDeleted(string conversationId, string deletedBy);
        Task NotifyMessagePinned(string conversationId, int messageId, object messageData, string pinnedBy);
        Task NotifyMessageUnpinned(string conversationId, int messageId, string unpinnedBy);
        Task NotifyMessageDeleted(string conversationId, int messageId, string deletedBy);
        Task NotifyGroupNameUpdate(string conversationId, string newName, string updatedBy);

        // Comment methods
        Task SendCommentToPost(int postId, object comment);
        Task NotifyCommentUpdated(int postId, object comment);
        Task NotifyCommentDeleted(int postId, int commentId, string deletedBy);
        Task NotifyCommentReply(int postId, int parentCommentId, object replyComment);

        // Notification methods
        Task SendNotificationToUser(int userId, object notification);
        Task SendNotificationToMultipleUsers(List<int> userIds, object notification);
    }
}
