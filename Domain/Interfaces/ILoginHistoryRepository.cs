using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface ILoginHistoryRepository
    {
        Task<LoginHistory> AddAsync(LoginHistory loginHistory);
        Task<IEnumerable<LoginHistory>> GetByAccountIdAsync(int accountId, int pageNumber = 1, int pageSize = 10);
        Task<int> GetTotalCountByAccountIdAsync(int accountId);
    }
}
