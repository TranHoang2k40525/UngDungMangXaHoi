using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IAccountRepository
    {
        Task<Account?> GetByIdAsync(int id);
        Task<Account?> GetByEmailAsync(Email email);
        Task<Account?> GetByPhoneAsync(string phone);
        Task<Account> AddAsync(Account account);
        Task UpdateAsync(Account account);
        Task<bool> ExistsByEmailAsync(Email email);
        Task<bool> ExistsByPhoneAsync(string phone);
    }
}