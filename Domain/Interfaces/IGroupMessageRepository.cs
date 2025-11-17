using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IGroupMessageRepository
    {
        /// <summary>
        /// Lấy danh sách messages của một conversation với pagination
        /// </summary>
    Task<List<GroupMessage>> GetMessagesByConversationIdAsync(int conversationId, int page = 1, int pageSize = 50);
        
        /// <summary>
        /// Lấy một message theo ID (kèm thông tin user và reply)
        /// </summary>
    Task<GroupMessage?> GetMessageByIdAsync(int messageId);
        
        /// <summary>
        /// Thêm message mới
        /// </summary>
    Task<GroupMessage> AddMessageAsync(GroupMessage message);
        
        /// <summary>
        /// Cập nhật message (edit content, soft delete, etc.)
        /// </summary>
    Task<bool> UpdateMessageAsync(GroupMessage message);
        
        /// <summary>
        /// Xóa message (soft delete)
        /// </summary>
        Task<bool> DeleteMessageAsync(int messageId);
        
        /// <summary>
        /// Đánh dấu tin nhắn đã đọc bởi user
        /// </summary>
        Task<bool> MarkAsReadAsync(int messageId, int userId);
        
        /// <summary>
        /// Thêm/Update reaction cho message
        /// </summary>
        Task<bool> AddReactionAsync(int messageId, int userId, string emoji);
        
        /// <summary>
        /// Xóa reaction của user khỏi message
        /// </summary>
        Task<bool> RemoveReactionAsync(int messageId, int userId, string emoji);

        /// <summary>
        /// Lấy danh sách reactions cho message (từ bảng MessageReactions)
        /// </summary>
        Task<List<GroupMessageReaction>> GetReactionsAsync(int messageId);

        /// <summary>
        /// Lấy danh sách read receipts cho message (từ bảng MessageReads)
        /// </summary>
        Task<List<GroupMessageRead>> GetReadsAsync(int messageId);

            /// <summary>
            /// Lấy danh sách message ids chưa được user đọc trong conversation up to given message id (inclusive)
            /// </summary>
            Task<List<int>> GetUnreadMessageIdsForUserAsync(int conversationId, int userId, int upToMessageId);

            /// <summary>
            /// Thêm nhiều bản ghi GroupMessageReads cho user
            /// </summary>
            Task<bool> AddReadsForUserAsync(List<int> messageIds, int userId, DateTime readAt);
        
        /// <summary>
        /// Lấy danh sách replies của một message (threaded chat)
        /// </summary>
    Task<List<GroupMessage>> GetThreadMessagesAsync(int parentMessageId);
        
        /// <summary>
        /// Đếm số lượng unread messages trong conversation cho user
        /// </summary>
        Task<int> GetUnreadCountAsync(int conversationId, int userId);
        
        /// <summary>
        /// Lấy message cuối cùng của conversation (để hiện preview)
        /// </summary>
    Task<GroupMessage?> GetLastMessageAsync(int conversationId);

            // Pin/Unpin support (group chat only)
            Task<bool> PinMessageAsync(int conversationId, int messageId, int pinnedBy);
            Task<bool> UnpinMessageAsync(int conversationId, int messageId);
            Task<List<GroupMessage>> GetPinnedMessagesAsync(int conversationId);

    // Media & Links
    Task<List<GroupMessage>> GetMediaMessagesAsync(int conversationId, string? mediaType = null);
    }
}
