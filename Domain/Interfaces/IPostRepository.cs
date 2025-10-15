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
        Task UpdateAsync(Post post);
        Task DeleteAsync(int postId);
    }
}
