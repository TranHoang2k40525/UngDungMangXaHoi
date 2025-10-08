using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IPostRepository
    {
        Task<Post?> GetByIdAsync(Guid id);
        Task<IEnumerable<Post>> GetByAuthorIdAsync(Guid authorId, int pageNumber, int pageSize);
        Task<IEnumerable<Post>> GetFeedAsync(Guid userId, int pageNumber, int pageSize);
        Task<IEnumerable<Post>> GetAllAsync(int pageNumber, int pageSize);
        Task<Post> AddAsync(Post post);
        Task UpdateAsync(Post post);
        Task DeleteAsync(Guid id);
        Task<bool> ExistsAsync(Guid id);
        Task<bool> IsAuthorAsync(Guid postId, Guid userId);
        Task<int> GetTotalPostsCountAsync();
        Task<int> GetPostsCountByAuthorAsync(Guid authorId);
    }
}

