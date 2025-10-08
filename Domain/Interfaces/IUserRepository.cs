using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(Guid id);
        Task<User?> GetByEmailAsync(Email email);
        Task<User?> GetByUserNameAsync(UserName userName);
        Task<IEnumerable<User>> GetAllAsync();
        Task<IEnumerable<User>> GetUsersByIdsAsync(IEnumerable<Guid> userIds);
        Task<User> AddAsync(User user);
        Task UpdateAsync(User user);
        Task DeleteAsync(Guid id);
        Task<bool> ExistsAsync(Guid id);
        Task<bool> ExistsByEmailAsync(Email email);
        Task<bool> ExistsByUserNameAsync(UserName userName);
        Task<IEnumerable<User>> SearchUsersAsync(string searchTerm, int pageNumber, int pageSize);
        Task<int> GetTotalUsersCountAsync();
    }
}

