using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Infrastructure.Persistence;

#pragma warning disable CS8604 // Possible null reference argument for parameter

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class AdminRepository : IAdminRepository
    {
        private readonly AppDbContext _context;

        public AdminRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Admin?> GetByIdAsync(int adminId)
        {
            return await _context.Admins
                .Include(a => a.Account)
                .FirstOrDefaultAsync(a => a.admin_id == adminId);
        }

        public async Task<Admin?> GetByAccountIdAsync(int accountId)
        {
            return await _context.Admins
                .Include(a => a.Account)
                .FirstOrDefaultAsync(a => a.account_id == accountId);
        }

        public async Task<Admin?> GetByEmailAsync(Email email)
        {
            return await _context.Admins
                .Include(a => a.Account)
                .FirstOrDefaultAsync(a => a.Account.email != null && a.Account.email.Value.ToLower() == email.Value.ToLower());
        }

    public async Task<Admin> AddAsync(Admin admin)
        {
            _context.Admins.Add(admin);
            await _context.SaveChangesAsync();
            return admin;
        }

    public async Task UpdateAsync(Admin admin)
        {
            _context.Admins.Update(admin);
            await _context.SaveChangesAsync();
        }

    public async Task<bool> ExistsByEmailAsync(Email email)
        {
            return await _context.Admins
                .AnyAsync(a => a.Account.email !=null && a.Account.email.Value.ToLower() == email.Value.ToLower());
        }
    }
}
