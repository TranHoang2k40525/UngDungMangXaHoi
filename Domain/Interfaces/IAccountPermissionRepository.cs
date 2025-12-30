using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    /// <summary>
    /// Interface for managing account-specific permissions (overrides)
    /// </summary>
    public interface IAccountPermissionRepository
    {
        Task<IEnumerable<AccountPermission>> GetAccountPermissionsAsync(int accountId);
        Task<AccountPermission?> GetAccountPermissionAsync(int accountId, int permissionId);
        Task<AccountPermission> GrantPermissionAsync(int accountId, int permissionId, DateTime? expiresAt = null, string? assignedBy = null, string? reason = null);
        Task<AccountPermission> RevokePermissionAsync(int accountId, int permissionId, string? assignedBy = null, string? reason = null);
        Task<bool> RemovePermissionAsync(int accountId, int permissionId);
        Task<IEnumerable<AccountPermission>> GetExpiredPermissionsAsync();
        Task<int> RemoveExpiredPermissionsAsync();
    }
}
