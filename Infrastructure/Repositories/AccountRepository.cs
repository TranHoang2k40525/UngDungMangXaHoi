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
    public class AccountRepository : IAccountRepository
    {
        private readonly AppDbContext _context;

        public AccountRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Account?> GetByIdAsync(int id)
        {
            return await _context.Accounts
                .Include(a => a.User)
                .Include(a => a.Admin)
                .FirstOrDefaultAsync(a => a.account_id == id);
        }

        public async Task<Account?> GetByEmailAsync(Email email)
        {
            return await _context.Accounts
                .Include(a => a.User)
                .Include(a => a.Admin)
                .FirstOrDefaultAsync(a => a.email != null && a.email!.Value.ToLower() == email!.Value.ToLower());
        }

        public async Task<Account?> GetByPhoneAsync(string phone)
        {
            return await _context.Accounts
                .Include(a => a.User)
                .Include(a => a.Admin)
                .FirstOrDefaultAsync(a => a.phone != null && a.phone.Value == phone);
        }

        public async Task<Account> AddAsync(Account account)
        {
            _context.Accounts.Add(account);
            await _context.SaveChangesAsync();
            return account;
        }

        public async Task UpdateAsync(Account account)
        {
            _context.Accounts.Update(account);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ExistsByEmailAsync(Email email)
        {
            return await _context.Accounts
                .AnyAsync(a => a.email != null && a.email!.Value.ToLower() == email!.Value.ToLower());
        }

        public async Task<bool> ExistsByPhoneAsync(string phone)
        {
            return await _context.Accounts
                .AnyAsync(a => a.phone != null && a.phone.Value == phone);
        }
    }
}