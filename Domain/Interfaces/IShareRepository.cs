using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IShareRepository
    {
        Task<Share?> GetByIdAsync(int shareId);
        Task<List<Share>> GetByPostIdAsync(int postId);
        Task<List<Share>> GetByUserIdAsync(int userId);
        Task<int> GetShareCountByPostIdAsync(int postId);
        Task<Share> AddAsync(Share share);
        Task DeleteAsync(Share share);
    }
}
