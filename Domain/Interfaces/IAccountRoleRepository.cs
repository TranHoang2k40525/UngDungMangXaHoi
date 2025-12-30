using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    /// <summary>
    /// Interface for managing account roles in RBAC system
    /// </summary>
    public interface IAccountRoleRepository
    {
        /// <summary>
        /// Get all roles for an account
        /// </summary>
        Task<IEnumerable<AccountRole>> GetAccountRolesAsync(int accountId, bool activeOnly = true);
        
        /// <summary>
        /// Get all accounts with a specific role
        /// </summary>
        Task<IEnumerable<AccountRole>> GetRoleAccountsAsync(int roleId);
        
        /// <summary>
        /// Check if account has a specific role
        /// </summary>
        Task<bool> HasRoleAsync(int accountId, string roleName);
        
        /// <summary>
        /// Check if account has any of the specified roles
        /// </summary>
        Task<bool> HasAnyRoleAsync(int accountId, params string[] roleNames);
        
        /// <summary>
        /// Assign role to account
        /// </summary>
        Task<AccountRole> AssignRoleAsync(int accountId, int roleId, DateTime? expiresAt = null, string? assignedBy = null);
        
        /// <summary>
        /// Remove role from account
        /// </summary>
        Task<bool> RemoveRoleAsync(int accountId, int roleId);
        
        /// <summary>
        /// Deactivate role (without deleting)
        /// </summary>
        Task<bool> DeactivateRoleAsync(int accountId, int roleId);
        
        /// <summary>
        /// Activate role
        /// </summary>
        Task<bool> ActivateRoleAsync(int accountId, int roleId);
        
        /// <summary>
        /// Update role expiration
        /// </summary>
        Task<bool> UpdateExpirationAsync(int accountId, int roleId, DateTime? expiresAt);
        
        /// <summary>
        /// Get expired roles that need to be deactivated
        /// </summary>
        Task<IEnumerable<AccountRole>> GetExpiredRolesAsync();
        
        /// <summary>
        /// Deactivate expired roles (for background job)
        /// </summary>
        Task<int> DeactivateExpiredRolesAsync();
    }
}
