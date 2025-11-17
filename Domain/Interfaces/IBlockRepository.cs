using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IBlockRepository
    {
    
        Task<bool> IsBlockedAsync(int blockerId, int blockedId);
        Task BlockUserAsync(int blockerId, int blockedId);
        Task UnblockUserAsync(int blockerId, int blockedId);
        Task<IEnumerable<object>> GetBlockedUsersAsync(int blockerId);
    
        Task<bool> AreBlockingEachOtherAsync(int userId1, int userId2);
        
        Task<Block?> GetBlockAsync(int blockerId, int blockedId);
        Task AddBlockAsync(Block block);
        Task RemoveBlockAsync(Block block);
        Task SaveChangesAsync();
    }
}


