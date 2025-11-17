using Microsoft.AspNetCore.SignalR;
using UngDungMangXaHoi.Presentation.WebAPI.Hubs;

namespace UngDungMangXaHoi.WebAPI.Services
{
    /// <summary>
    /// Implementation của SignalR service để broadcast messages
    /// </summary>
    public class SignalRService : ISignalRService
    {
    private readonly IHubContext<GroupChatHub> _chatHub;
        private readonly IHubContext<CommentHub> _commentHub;
        private readonly IHubContext<NotificationHub> _notificationHub;
        private readonly ILogger<SignalRService> _logger;

        public SignalRService(
            IHubContext<GroupChatHub> chatHub,
            IHubContext<CommentHub> commentHub,
            IHubContext<NotificationHub> notificationHub,
            ILogger<SignalRService> logger)
        {
            _chatHub = chatHub;
            _commentHub = commentHub;
            _notificationHub = notificationHub;
            _logger = logger;
        }

        #region Chat Methods

        public async Task SendMessageToGroup(string conversationId, object messageData)
        {
            try
            {
                await _chatHub.Clients.Group(conversationId)
                    .SendAsync("ReceiveMessage", messageData);
                
                _logger.LogInformation($"Message sent to group {conversationId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending message to group {conversationId}");
                throw;
            }
        }

        public async Task NotifyGroupAvatarUpdate(string conversationId, string avatarUrl, string updatedBy)
        {
            try
            {
                await _chatHub.Clients.Group(conversationId)
                    .SendAsync("GroupAvatarUpdated", new
                    {
                        conversationId,
                        avatarUrl,
                        updatedBy,
                        timestamp = DateTime.UtcNow
                    });

                _logger.LogInformation($"Group avatar update notification sent to {conversationId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error notifying group avatar update for {conversationId}");
                throw;
            }
        }

        public async Task NotifyMessagePinned(string conversationId, int messageId, object messageData, string pinnedBy)
        {
            try
            {
                await _chatHub.Clients.Group(conversationId)
                    .SendAsync("MessagePinned", new
                    {
                        conversationId,
                        messageId,
                        messageData,
                        pinnedBy,
                        timestamp = DateTime.UtcNow
                    });

                _logger.LogInformation($"Message pinned notification sent to {conversationId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error notifying message pinned for {conversationId}");
                throw;
            }
        }

        public async Task NotifyMessageUnpinned(string conversationId, int messageId, string unpinnedBy)
        {
            try
            {
                await _chatHub.Clients.Group(conversationId)
                    .SendAsync("MessageUnpinned", new
                    {
                        conversationId,
                        messageId,
                        unpinnedBy,
                        timestamp = DateTime.UtcNow
                    });

                _logger.LogInformation($"Message unpinned notification sent to {conversationId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error notifying message unpinned for {conversationId}");
                throw;
            }
        }

        public async Task NotifyMessageDeleted(string conversationId, int messageId, string deletedBy)
        {
            try
            {
                await _chatHub.Clients.Group(conversationId)
                    .SendAsync("MessageDeleted", new
                    {
                        conversationId,
                        messageId,
                        deletedBy,
                        timestamp = DateTime.UtcNow
                    });

                _logger.LogInformation($"Message deleted notification sent to {conversationId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error notifying message deleted for {conversationId}");
                throw;
            }
        }

        public async Task NotifyGroupNameUpdate(string conversationId, string newName, string updatedBy)
        {
            try
            {
                await _chatHub.Clients.Group(conversationId)
                    .SendAsync("GroupNameUpdated", new
                    {
                        conversationId,
                        newName,
                        updatedBy,
                        timestamp = DateTime.UtcNow
                    });

                _logger.LogInformation($"Group name update notification sent to {conversationId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error notifying group name update for {conversationId}");
                throw;
            }
        }

        public async Task NotifyGroupDeleted(string conversationId, string deletedBy)
        {
            try
            {
                await _chatHub.Clients.Group(conversationId)
                    .SendAsync("GroupDeleted", new
                    {
                        conversationId,
                        deletedBy,
                        timestamp = DateTime.UtcNow
                    });

                _logger.LogInformation($"Group deleted notification sent to {conversationId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error notifying group deleted for {conversationId}");
                throw;
            }
        }

        public async Task NotifyMemberRemoved(string conversationId, string removedUserId, string removedBy)
        {
            try
            {
                await _chatHub.Clients.Group(conversationId)
                    .SendAsync("MemberRemoved", new
                    {
                        conversationId,
                        removedUserId,
                        removedBy,
                        timestamp = DateTime.UtcNow
                    });

                _logger.LogInformation($"Member removed notification sent to {conversationId} for user {removedUserId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error notifying member removed for {conversationId}");
                throw;
            }
        }

        #endregion

        #region Comment Methods

        public async Task SendCommentToPost(int postId, object comment)
        {
            try
            {
                await _commentHub.Clients.Group($"post_{postId}")
                    .SendAsync("ReceiveComment", comment);

                _logger.LogInformation($"Comment sent to post {postId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending comment to post {postId}");
                throw;
            }
        }

        public async Task NotifyCommentUpdated(int postId, object comment)
        {
            try
            {
                await _commentHub.Clients.Group($"post_{postId}")
                    .SendAsync("CommentUpdated", comment);

                _logger.LogInformation($"Comment update notification sent to post {postId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error notifying comment update for post {postId}");
                throw;
            }
        }

        public async Task NotifyCommentDeleted(int postId, int commentId, string deletedBy)
        {
            try
            {
                await _commentHub.Clients.Group($"post_{postId}")
                    .SendAsync("CommentDeleted", new
                    {
                        postId,
                        commentId,
                        deletedBy,
                        timestamp = DateTime.UtcNow
                    });

                _logger.LogInformation($"Comment deleted notification sent to post {postId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error notifying comment deleted for post {postId}");
                throw;
            }
        }

        public async Task NotifyCommentReply(int postId, int parentCommentId, object replyComment)
        {
            try
            {
                await _commentHub.Clients.Group($"post_{postId}")
                    .SendAsync("CommentReplyAdded", new
                    {
                        parentCommentId,
                        replyComment,
                        timestamp = DateTime.UtcNow
                    });

                _logger.LogInformation($"Comment reply notification sent to post {postId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error notifying comment reply for post {postId}");
                throw;
            }
        }

        #endregion

        #region Notification Methods

        public async Task SendNotificationToUser(int userId, object notification)
        {
            try
            {
                await _notificationHub.Clients.Group($"user_{userId}")
                    .SendAsync("ReceiveNotification", notification);

                _logger.LogInformation($"Notification sent to user {userId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending notification to user {userId}");
                throw;
            }
        }

        public async Task SendNotificationToMultipleUsers(List<int> userIds, object notification)
        {
            try
            {
                var tasks = userIds.Select(userId =>
                    _notificationHub.Clients.Group($"user_{userId}")
                        .SendAsync("ReceiveNotification", notification)
                );

                await Task.WhenAll(tasks);

                _logger.LogInformation($"Notification sent to {userIds.Count} users");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending notification to multiple users");
                throw;
            }
        }

        #endregion
    }
}
