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
    public class LoginHistoryRepository : ILoginHistoryRepository
    {
        private readonly AppDbContext _context;

        public LoginHistoryRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<LoginHistory> AddAsync(LoginHistory loginHistory)
        {
            _context.LoginHistory.Add(loginHistory);
            await _context.SaveChangesAsync();
            return loginHistory;
        }

        public async Task<IEnumerable<LoginHistory>> GetByAccountIdAsync(int accountId, int pageNumber = 1, int pageSize = 10)
        {
            return await _context.LoginHistory
                .Where(lh => lh.account_id == accountId)
                .OrderByDescending(lh => lh.login_time)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> GetTotalCountByAccountIdAsync(int accountId)
        {
            return await _context.LoginHistory
                .CountAsync(lh => lh.account_id == accountId);
        }
    }
}
