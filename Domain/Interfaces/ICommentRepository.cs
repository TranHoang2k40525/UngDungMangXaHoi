using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface ICommentRepository
    {
        Task<Comment> AddAsync(Comment comment);
        Task<Comment?> GetByIdAsync(int id);
        Task<List<Comment>> GetByPostIdAsync(int postId, int pageNumber = 1, int pageSize = 20);
        Task<List<Comment>> GetRepliesAsync(int parentCommentId);
        Task<bool> UpdateAsync(Comment comment);
        Task<bool> DeleteAsync(int id);
        Task<int> GetCommentsCountByPostIdAsync(int postId);
        
        // Like/Unlike
        Task<bool> LikeCommentAsync(int commentId, int userId);
        Task<bool> UnlikeCommentAsync(int commentId, int userId);
        Task<bool> IsCommentLikedByUserAsync(int commentId, int userId);
        Task<int> GetLikesCountAsync(int commentId);
        
        // For mention/hashtag search
        Task<List<Comment>> GetCommentsByUserMentionAsync(int userId);
        Task<List<Comment>> GetCommentsByHashtagAsync(string hashtag);
    }
}
