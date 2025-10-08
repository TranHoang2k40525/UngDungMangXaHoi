using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Infrastructure.Persistence;

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
                .FirstOrDefaultAsync(a => a.email.Value == email.Value);
        }

        public async Task<Account?> GetByPhoneAsync(PhoneNumber phone)
        {
            return await _context.Accounts
                .Include(a => a.User)
                .Include(a => a.Admin)
                .FirstOrDefaultAsync(a => a.phone.Value == phone.Value);
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
            return await _context.Accounts.AnyAsync(a => a.email.Value == email.Value);
        }

        public async Task<bool> ExistsByPhoneAsync(PhoneNumber phone)
        {
            return await _context.Accounts.AnyAsync(a => a.phone.Value == phone.Value);
        }
    }
}