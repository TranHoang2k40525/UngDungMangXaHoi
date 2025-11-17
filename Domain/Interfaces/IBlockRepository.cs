using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IBlockRepository
    {
        /// <summary>
        /// Kiểm tra xem user1 có chặn user2 không
        /// </summary>
        Task<bool> IsBlockedAsync(int blockerId, int blockedId);
        
        /// <summary>
        /// Kiểm tra xem hai user có chặn nhau không (bất kỳ chiều nào)
        /// </summary>
        Task<bool> AreBlockingEachOtherAsync(int userId1, int userId2);
        
        Task<Block?> GetBlockAsync(int blockerId, int blockedId);
        Task AddBlockAsync(Block block);
        Task RemoveBlockAsync(Block block);
        Task SaveChangesAsync();
    }
}
