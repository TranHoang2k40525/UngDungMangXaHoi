using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface ICommentRepository
    {
        Task<Comment?> GetByIdAsync(Guid id);
        Task<IEnumerable<Comment>> GetByPostIdAsync(Guid postId, int pageNumber, int pageSize);
        Task<IEnumerable<Comment>> GetByAuthorIdAsync(Guid authorId, int pageNumber, int pageSize);
        Task<IEnumerable<Comment>> GetRepliesAsync(Guid parentCommentId, int pageNumber, int pageSize);
        Task<Comment> AddAsync(Comment comment);
        Task UpdateAsync(Comment comment);
        Task DeleteAsync(Guid id);
        Task<bool> ExistsAsync(Guid id);
        Task<bool> IsAuthorAsync(Guid commentId, Guid userId);
        Task<int> GetTotalCommentsCountAsync();
        Task<int> GetCommentsCountByPostAsync(Guid postId);
        Task<int> GetCommentsCountByAuthorAsync(Guid authorId);
    }
}

