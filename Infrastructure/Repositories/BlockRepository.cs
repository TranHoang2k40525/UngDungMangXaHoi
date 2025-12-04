
using System;
using System.Collections.Generic;
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

            return await _context.Blocks.AnyAsync(b => b.blocker_id == blockerId && b.blocked_id == blockedId);
        }

        public async Task BlockUserAsync(int blockerId, int blockedId)
        {
            // If already blocked, noop
            var exists = await IsBlockedAsync(blockerId, blockedId);
            if (exists) return;

            // Remove any follow relationships between the two users (both directions)
            var f1 = await _context.Follows.FirstOrDefaultAsync(f => f.follower_id == blockerId && f.following_id == blockedId);
            if (f1 != null) _context.Follows.Remove(f1);
            var f2 = await _context.Follows.FirstOrDefaultAsync(f => f.follower_id == blockedId && f.following_id == blockerId);
            if (f2 != null) _context.Follows.Remove(f2);

            var block = new Block
            {
                blocker_id = blockerId,
                blocked_id = blockedId,
                created_at = DateTime.UtcNow
            };
            // Add block record and persist changes (also persist any follow removals above)
            _context.Blocks.Add(block);
            await _context.SaveChangesAsync();
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

        public async Task UnblockUserAsync(int blockerId, int blockedId)
        {
            var block = await _context.Blocks.FirstOrDefaultAsync(b => b.blocker_id == blockerId && b.blocked_id == blockedId);
            if (block != null)
            {
                _context.Blocks.Remove(block);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<object>> GetBlockedUsersAsync(int blockerId)
        {
            var list = await _context.Blocks
                .Where(b => b.blocker_id == blockerId)
                .Join(_context.Users.Include(u => u.Account),
                    block => block.blocked_id,
                    user => user.user_id,
                    (block, user) => new
                    {
                        userId = user.user_id,
                        username = user.username.Value,
                        fullName = user.full_name,
                        avatarUrl = user.avatar_url != null ? user.avatar_url.Value : null,
                        blockedAt = block.created_at
                    })
                .ToListAsync();

            return list;
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
