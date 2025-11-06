using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces;

public interface ICommentRepository
{
    // Create
    Task<Comment> CreateAsync(Comment comment);
    
    // Read
    Task<Comment?> GetByIdAsync(int commentId);
    Task<IEnumerable<Comment>> GetCommentsByPostIdAsync(int postId, int pageNumber = 1, int pageSize = 20);
    Task<IEnumerable<Comment>> GetRepliesByCommentIdAsync(int parentCommentId);
    Task<int> GetCommentCountByPostIdAsync(int postId);
    Task<int> GetReplyCountByCommentIdAsync(int commentId);
    
    // Update
    Task<Comment> UpdateAsync(Comment comment);
    
    // Delete
    Task<bool> DeleteAsync(int commentId);
    Task<bool> SoftDeleteAsync(int commentId);
    
    // Mentions
    Task<IEnumerable<CommentMention>> GetMentionsByCommentIdAsync(int commentId);
    Task<IEnumerable<Comment>> GetCommentsByMentionedUserAsync(int accountId, int pageNumber = 1, int pageSize = 20);
    
    // Reactions
    Task<CommentReaction?> GetReactionAsync(int commentId, int accountId);
    Task<CommentReaction> AddReactionAsync(CommentReaction reaction);
    Task<bool> RemoveReactionAsync(int commentId, int accountId);
    Task<Dictionary<string, int>> GetReactionCountsAsync(int commentId);
    
    // Search
    Task<IEnumerable<Comment>> SearchByHashtagAsync(string hashtag, int pageNumber = 1, int pageSize = 20);
    Task<IEnumerable<Comment>> GetCommentsByUserAsync(int accountId, int pageNumber = 1, int pageSize = 20);
}
