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
        }        public async Task<IEnumerable<User>> SearchUsersAsync(string searchTerm, int pageNumber, int pageSize)
        {
            searchTerm = searchTerm.ToLower();
            
            // Tìm users có CHỮ CÁI ĐẦU TIÊN của tên hoặc username bắt đầu bằng searchTerm
            var query = _context.Users
                .Include(u => u.Account)
                .Where(u => u.Account.status == "active" &&
                    (u.full_name.ToLower().StartsWith(searchTerm) ||
                     u.username.Value.ToLower().StartsWith(searchTerm) ||
                     // Hoặc CHỮ CÁI ĐẦU của từ thứ 2, 3... (sau khoảng trắng)
                     u.full_name.ToLower().Contains(" " + searchTerm)));

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

        public async Task<bool> IsFollowingAsync(int followerId, int followingId)
        {
            return await _context.Follows
                .AnyAsync(f => f.follower_id == followerId && f.following_id == followingId);
        }

        public async Task FollowUserAsync(int followerId, int followingId)
        {
            // Kiểm tra xem đã follow chưa
            var exists = await IsFollowingAsync(followerId, followingId);
            if (!exists)
            {
                var follow = new Follow
                {
                    follower_id = followerId,
                    following_id = followingId,
                    created_at = DateTime.UtcNow
                };
                _context.Follows.Add(follow);
                await _context.SaveChangesAsync();
            }
        }

        public async Task UnfollowUserAsync(int followerId, int followingId)
        {
            var follow = await _context.Follows
                .FirstOrDefaultAsync(f => f.follower_id == followerId && f.following_id == followingId);
            if (follow != null)
            {
                _context.Follows.Remove(follow);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<object>> GetFollowersListAsync(int userId)
        {
            // Get users who follow this userId
            var followers = await _context.Follows
                .Where(f => f.following_id == userId)
                .Join(_context.Users.Include(u => u.Account),
                    follow => follow.follower_id,
                    user => user.user_id,
                    (follow, user) => new
                    {
                        userId = user.user_id,
                        username = user.username.Value,
                        fullName = user.full_name,
                        avatarUrl = user.avatar_url != null ? user.avatar_url.Value : null
                    })
                .ToListAsync();
            return followers;
        }

        public async Task<IEnumerable<object>> GetFollowingListAsync(int userId)
        {
            // Get users that this userId is following
            var following = await _context.Follows
                .Where(f => f.follower_id == userId)
                .Join(_context.Users.Include(u => u.Account),
                    follow => follow.following_id,
                    user => user.user_id,
                    (follow, user) => new
                    {
                        userId = user.user_id,
                        username = user.username.Value,
                        fullName = user.full_name,
                        avatarUrl = user.avatar_url != null ? user.avatar_url.Value : null
                    })                .ToListAsync();
            return following;
        }

        // Conversation/Message history methods (placeholder for future implementation)
        public async Task<bool> HasMessagedBeforeAsync(int userId1, int userId2)
        {
            // TODO: Implement when Conversation/Message tables are added
            // For now, return false (no message history)
            return await Task.FromResult(false);
        }

        public async Task<IEnumerable<int>> GetUsersMessagedBeforeAsync(int userId)
        {
            // TODO: Implement when Conversation/Message tables are added
            // For now, return empty list
            return await Task.FromResult(new List<int>());
        }
    }
}