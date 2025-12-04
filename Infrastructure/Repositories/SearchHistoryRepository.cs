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
    /// <summary>
    /// Repository implementation cho SearchHistory
    /// </summary>
    public class SearchHistoryRepository : ISearchHistoryRepository
    {
        private readonly AppDbContext _context;

        public SearchHistoryRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddSearchHistoryAsync(int userId, string keyword)
        {
            if (string.IsNullOrWhiteSpace(keyword)) return;

            var searchHistory = new SearchHistory
            {
                user_id = userId,
                keyword = keyword.Trim(),
                searched_at = DateTime.UtcNow
            };

            _context.SearchHistories.Add(searchHistory);
            await _context.SaveChangesAsync();
        }

        public async Task<List<string>> GetRecentSearchKeywordsAsync(int userId, int limit = 20)
        {
            return await _context.SearchHistories
                .Where(sh => sh.user_id == userId && sh.keyword != null)
                .OrderByDescending(sh => sh.searched_at)
                .Select(sh => sh.keyword!)
                .Distinct()
                .Take(limit)
                .ToListAsync();
        }

        public async Task<List<string>> GetTopSearchKeywordsAsync(int userId, int limit = 10)
        {
            return await _context.SearchHistories
                .Where(sh => sh.user_id == userId && sh.keyword != null)
                .GroupBy(sh => sh.keyword)
                .OrderByDescending(g => g.Count())
                .ThenByDescending(g => g.Max(sh => sh.searched_at))
                .Select(g => g.Key!)
                .Take(limit)
                .ToListAsync();
        }
    }
}
