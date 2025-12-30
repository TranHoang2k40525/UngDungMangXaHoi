using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IPermissionRepository
    {
        Task<Permission?> GetByIdAsync(int permissionId);
        Task<Permission?> GetByNameAsync(string permissionName);
        Task<IEnumerable<Permission>> GetAllAsync();
        Task<IEnumerable<Permission>> GetByModuleAsync(string module);
        Task<Permission> CreateAsync(Permission permission);
        Task<Permission> UpdateAsync(Permission permission);
        Task<bool> DeleteAsync(int permissionId);
        Task<bool> ExistsAsync(string permissionName);
    }
}
