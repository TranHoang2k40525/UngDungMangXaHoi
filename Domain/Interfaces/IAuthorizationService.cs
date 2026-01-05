using System.Collections.Generic;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    /// <summary>
    /// Authorization service interface for RBAC permission checking
    /// </summary>
    public interface IAuthorizationService
    {
        /// <summary>
        /// Check if account has a specific permission
        /// Considers: Role permissions + Account-specific permissions (grants/revokes)
        /// </summary>
        Task<bool> HasPermissionAsync(int accountId, string permissionName);
        
        /// <summary>
        /// Check if account has any of the specified permissions
        /// </summary>
        Task<bool> HasAnyPermissionAsync(int accountId, params string[] permissionNames);
        
        /// <summary>
        /// Check if account has all of the specified permissions
        /// </summary>
        Task<bool> HasAllPermissionsAsync(int accountId, params string[] permissionNames);
        
        /// <summary>
        /// Get all effective permissions for an account
        /// (Role permissions + Account grants - Account revokes)
        /// </summary>
        Task<IEnumerable<string>> GetAccountPermissionsAsync(int accountId);
        
        /// <summary>
        /// Check if account has a specific role
        /// </summary>
        Task<bool> HasRoleAsync(int accountId, string roleName);
        
        /// <summary>
        /// Check if account has any of the specified roles
        /// </summary>
        Task<bool> HasAnyRoleAsync(int accountId, params string[] roleNames);
        
        /// <summary>
        /// Get all active roles for an account
        /// </summary>
        Task<IEnumerable<string>> GetAccountRolesAsync(int accountId);
        
        /// <summary>
        /// Get the highest priority role for an account
        /// </summary>
        Task<string?> GetPrimaryRoleAsync(int accountId);
    }
}
