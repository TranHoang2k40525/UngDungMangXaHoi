using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    /// <summary>
    /// Repository interface cho Post operations
    /// </summary>
    public interface IPostRepository
    {
        Task<Post> AddAsync(Post post);
        Task<PostMedia> AddMediaAsync(PostMedia media);
        Task<Post?> GetByIdAsync(int postId);
        Task<Post?> GetByIdWithMediaAsync(int postId);
        Task UpdateAsync(Post post);
        Task DeleteAsync(int postId);
        // Query helpers
        Task<IEnumerable<Post>> GetFeedAsync(int? currentUserId, int pageNumber, int pageSize);
        Task<IEnumerable<Post>> GetUserPostsAsync(int userId, int pageNumber, int pageSize);
        Task<IEnumerable<Post>> GetUserPostsForViewerAsync(int userId, int? viewerUserId, int pageNumber, int pageSize);
        Task<IEnumerable<Post>> GetVideoPostsAsync(int? currentUserId, int pageNumber, int pageSize);
        Task<IEnumerable<Post>> GetAllVideoPostsAsync(int? currentUserId);
        Task<IEnumerable<Post>> GetFollowingVideoPostsAsync(int currentUserId, int pageNumber, int pageSize);
        Task<int> GetUserPostCountAsync(int userId);
        Task<int> CountPostsByUserIdAsync(int userId);
    }
}
