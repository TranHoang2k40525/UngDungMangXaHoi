using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _context;

        public UserRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetByIdAsync(Guid id)
        {
            return await _context.Users
                .Include(u => u.Posts)
                .Include(u => u.Comments)
                .FirstOrDefaultAsync(u => u.Id == id);
        }

        public async Task<User?> GetByEmailAsync(Email email)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Email.Value == email.Value);
        }

        public async Task<User?> GetByUserNameAsync(UserName userName)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.UserName.Value == userName.Value);
        }

        public async Task<IEnumerable<User>> GetAllAsync()
        {
            return await _context.Users
                .Where(u => u.IsActive)
                .OrderBy(u => u.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<User>> GetUsersByIdsAsync(IEnumerable<Guid> userIds)
        {
            return await _context.Users
                .Where(u => userIds.Contains(u.Id) && u.IsActive)
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

        public async Task DeleteAsync(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user != null)
            {
                user.Deactivate();
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> ExistsAsync(Guid id)
        {
            return await _context.Users.AnyAsync(u => u.Id == id);
        }

        public async Task<bool> ExistsByEmailAsync(Email email)
        {
            return await _context.Users.AnyAsync(u => u.Email.Value == email.Value);
        }

        public async Task<bool> ExistsByUserNameAsync(UserName userName)
        {
            return await _context.Users.AnyAsync(u => u.UserName.Value == userName.Value);
        }

        public async Task<IEnumerable<User>> SearchUsersAsync(string searchTerm, int pageNumber, int pageSize)
        {
            var query = _context.Users
                .Where(u => u.IsActive && 
                    (u.FirstName.Contains(searchTerm) || 
                     u.LastName.Contains(searchTerm) || 
                     u.UserName.Value.Contains(searchTerm)));

            return await query
                .OrderBy(u => u.FirstName)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> GetTotalUsersCountAsync()
        {
            return await _context.Users.CountAsync(u => u.IsActive);
        }
    }
}

