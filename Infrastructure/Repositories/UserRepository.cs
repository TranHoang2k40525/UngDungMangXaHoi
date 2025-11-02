using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Infrastructure.Persistence;

#pragma warning disable CS8604 // Possible null reference argument for parameter
#pragma warning disable CS8625 // Cannot convert null literal to non-nullable reference type

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _context;

        public UserRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            return await _context.Users
                .Include(u => u.Account)
                .FirstOrDefaultAsync(u => u.user_id == id);
        }

        public async Task<User?> GetByAccountIdAsync(int accountId)
        {
            return await _context.Users
                .Include(u => u.Account)
                .FirstOrDefaultAsync(u => u.account_id == accountId);
        }

        public async Task<User?> GetByEmailAsync(Email email)
        {
            return await _context.Users
                .Include(u => u.Account)
                .FirstOrDefaultAsync(u => u.Account.email != null && u.Account.email!.Value.ToLower() == email!.Value.ToLower());
        }

        public async Task<User?> GetByUserNameAsync(UserName userName)
        {
            return await _context.Users
                .Include(u => u.Account)
                .FirstOrDefaultAsync(u => u.username.Value == userName.Value);
        }

        public async Task<IEnumerable<User>> GetAllAsync()
        {
            return await _context.Users
                .Include(u => u.Account)
                .Where(u => u.Account.status == "active")
                .OrderBy(u => u.Account.created_at)
                .ToListAsync();
        }

        public async Task<IEnumerable<User>> GetUsersByIdsAsync(IEnumerable<int> userIds)
        {
            return await _context.Users
                .Include(u => u.Account)
                .Where(u => userIds.Contains(u.user_id) && u.Account.status == "active")
                .ToListAsync();
        }

        public async Task<User> AddAsync(User user)
        {
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task UpdateAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var user = await _context.Users
                .Include(u => u.Account)
                .FirstOrDefaultAsync(u => u.user_id == id);
            if (user != null)
            {
                user.Account.status = "deactivated";
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> ExistsAsync(int id)
        {
            return await _context.Users.AnyAsync(u => u.user_id == id);
        }

        public async Task<bool> ExistsByEmailAsync(Email email)
        {
            return await _context.Accounts.AnyAsync(a => a.email != null && a.email!.Value.ToLower() == email!.Value.ToLower());
        }

        public async Task<bool> ExistsByUserNameAsync(UserName userName)
        {
            return await _context.Users.AnyAsync(u => u.username.Value == userName.Value);
        }

        public async Task<IEnumerable<User>> SearchUsersAsync(string searchTerm, int pageNumber, int pageSize)
        {
            var query = _context.Users
                .Include(u => u.Account)
                .Where(u => u.Account.status == "active" &&
                    (u.full_name.ToLower().Contains(searchTerm.ToLower()) ||
                     u.username.Value.ToLower().Contains(searchTerm.ToLower())));

            return await query
                .OrderBy(u => u.full_name)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> GetTotalUsersCountAsync()
        {
            return await _context.Users
                .Include(u => u.Account)
                .CountAsync(u => u.Account.status == "active");
        }

        public async Task<int> GetFollowersCountAsync(int userId)
        {
            // số người theo dõi user này
            return await _context.Follows.CountAsync(f => f.following_id == userId);
        }

        public async Task<int> GetFollowingCountAsync(int userId)
        {
            // số người user này đang theo dõi
            return await _context.Follows.CountAsync(f => f.follower_id == userId);
        }
    }
}