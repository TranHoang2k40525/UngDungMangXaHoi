using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class ReactionRepository : IReactionRepository
    {
        private readonly AppDbContext _context;

        public ReactionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Reaction?> GetByPostAndUserAsync(int postId, int userId)
        {
            return await _context.Reactions
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.post_id == postId && r.user_id == userId);
        }

        public async Task<List<Reaction>> GetByPostIdAsync(int postId)
        {
            return await _context.Reactions
                .Include(r => r.User)
                .Where(r => r.post_id == postId)
                .OrderByDescending(r => r.created_at)
                .ToListAsync();
        }

        public async Task<Dictionary<ReactionType, int>> GetReactionCountsByPostIdAsync(int postId)
        {
            var reactions = await _context.Reactions
                .Where(r => r.post_id == postId)
                .GroupBy(r => r.reaction_type)
                .Select(g => new { ReactionType = g.Key, Count = g.Count() })
                .ToListAsync();

            return reactions.ToDictionary(r => r.ReactionType, r => r.Count);
        }

        public async Task<Reaction> AddAsync(Reaction reaction)
        {
            _context.Reactions.Add(reaction);
            await _context.SaveChangesAsync();
            return await GetByPostAndUserAsync(reaction.post_id, reaction.user_id) ?? reaction;
        }

        public async Task<Reaction> UpdateAsync(Reaction reaction)
        {
            _context.Reactions.Update(reaction);
            await _context.SaveChangesAsync();
            return reaction;
        }

        public async Task DeleteAsync(Reaction reaction)
        {
            _context.Reactions.Remove(reaction);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ExistsAsync(int postId, int userId)
        {
            return await _context.Reactions
                .AnyAsync(r => r.post_id == postId && r.user_id == userId);
        }
    }
}
