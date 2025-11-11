using System.Collections.Generic;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IBlockRepository
    {
        Task<bool> IsBlockedAsync(int blockerId, int blockedId);
        Task BlockUserAsync(int blockerId, int blockedId);
        Task UnblockUserAsync(int blockerId, int blockedId);
        Task<IEnumerable<object>> GetBlockedUsersAsync(int blockerId);
    }
}
