using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IAdminRepository
    {
        Task<Admin?> GetByIdAsync(int adminId);
        Task<Admin?> GetByAccountIdAsync(int accountId);
        Task<Admin?> GetByEmailAsync(Email email);
        Task<Admin> AddAsync(Admin admin);
        Task UpdateAsync(Admin admin);
        Task<bool> ExistsByEmailAsync(Email email);
    }
}
