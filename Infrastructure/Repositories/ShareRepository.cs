using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class ShareRepository : IShareRepository
    {
        private readonly AppDbContext _context;

        public ShareRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Share?> GetByIdAsync(int shareId)
        {
            return await _context.Shares
                .Include(s => s.User)
                .Include(s => s.Post)
                    .ThenInclude(p => p.Media)
                .FirstOrDefaultAsync(s => s.share_id == shareId);
        }

        public async Task<List<Share>> GetByPostIdAsync(int postId)
        {
            return await _context.Shares
                .Include(s => s.User)
                .Where(s => s.post_id == postId)
                .OrderByDescending(s => s.created_at)
                .ToListAsync();
        }

        public async Task<List<Share>> GetByUserIdAsync(int userId)
        {
            return await _context.Shares
                .Include(s => s.Post)
                    .ThenInclude(p => p.Media)
                .Include(s => s.Post.User)
                .Where(s => s.user_id == userId)
                .OrderByDescending(s => s.created_at)
                .ToListAsync();
        }

        public async Task<int> GetShareCountByPostIdAsync(int postId)
        {
            return await _context.Shares
                .Where(s => s.post_id == postId)
                .CountAsync();
        }

        public async Task<Share> AddAsync(Share share)
        {
            _context.Shares.Add(share);
            await _context.SaveChangesAsync();
            return await GetByIdAsync(share.share_id) ?? share;
        }

        public async Task DeleteAsync(Share share)
        {
            _context.Shares.Remove(share);
            await _context.SaveChangesAsync();
        }
    }
}
