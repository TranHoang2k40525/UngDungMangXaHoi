using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(int id);
        Task<User?> GetByEmailAsync(Email email);
        Task<User?> GetByUserNameAsync(UserName userName);
        Task<IEnumerable<User>> GetAllAsync();
        Task<IEnumerable<User>> GetUsersByIdsAsync(IEnumerable<int> userIds);
        Task<User> AddAsync(User user);
        Task UpdateAsync(User user);
        Task DeleteAsync(int id);
        Task<bool> ExistsAsync(int id);
        Task<bool> ExistsByEmailAsync(Email email);
        Task<bool> ExistsByUserNameAsync(UserName userName);
        Task<IEnumerable<User>> SearchUsersAsync(string searchTerm, int pageNumber, int pageSize);
        Task<int> GetTotalUsersCountAsync();
    }
}