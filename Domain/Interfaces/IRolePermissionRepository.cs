using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    /// <summary>
    /// Interface for managing role permissions
    /// </summary>
    public interface IRolePermissionRepository
    {
        Task<IEnumerable<Permission>> GetRolePermissionsAsync(int roleId);
        Task<IEnumerable<Permission>> GetRolePermissionsByNameAsync(string roleName);
        Task<bool> RoleHasPermissionAsync(int roleId, string permissionName);
        Task<RolePermission> GrantPermissionAsync(int roleId, int permissionId, string? grantedBy = null);
        Task<bool> RevokePermissionAsync(int roleId, int permissionId);
        Task<int> GrantMultiplePermissionsAsync(int roleId, IEnumerable<int> permissionIds, string? grantedBy = null);
        Task<int> RevokeMultiplePermissionsAsync(int roleId, IEnumerable<int> permissionIds);
    }
}
