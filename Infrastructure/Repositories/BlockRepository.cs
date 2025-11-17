using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class BlockRepository : IBlockRepository
    {
        private readonly AppDbContext _context;

        public BlockRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> IsBlockedAsync(int blockerId, int blockedId)
        {
            return await _context.Blocks
                .AnyAsync(b => b.blocker_id == blockerId && b.blocked_id == blockedId);
        }

        public async Task<bool> AreBlockingEachOtherAsync(int userId1, int userId2)
        {
            return await _context.Blocks
                .AnyAsync(b => (b.blocker_id == userId1 && b.blocked_id == userId2) ||
                              (b.blocker_id == userId2 && b.blocked_id == userId1));
        }

        public async Task<Block?> GetBlockAsync(int blockerId, int blockedId)
        {
            return await _context.Blocks
                .FirstOrDefaultAsync(b => b.blocker_id == blockerId && b.blocked_id == blockedId);
        }

        public async Task AddBlockAsync(Block block)
        {
            _context.Blocks.Add(block);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveBlockAsync(Block block)
        {
            _context.Blocks.Remove(block);
            await _context.SaveChangesAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
