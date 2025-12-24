using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces;

public interface ICommentRepository
{
    // Create
    Task<Comment> CreateAsync(Comment comment);
    
    // Read
    Task<Comment?> GetByIdAsync(int commentId);
    Task<IEnumerable<Comment>> GetCommentsByPostIdAsync(int postId, int pageNumber = 1, int pageSize = 20);
    Task<int> GetCommentCountByPostIdAsync(int postId);
    Task<Dictionary<int, int>> GetCommentCountsByPostIdsAsync(IEnumerable<int> postIds);
    
    // Update
    Task<Comment> UpdateAsync(Comment comment);
    
    // Delete
    Task<bool> DeleteAsync(int commentId);
    Task<bool> SoftDeleteAsync(int commentId);
    
    // Reactions
    Task<CommentReaction?> GetReactionAsync(int commentId, int accountId);
    Task<CommentReaction> AddReactionAsync(CommentReaction reaction);
    Task<bool> RemoveReactionAsync(int commentId, int accountId);
}
