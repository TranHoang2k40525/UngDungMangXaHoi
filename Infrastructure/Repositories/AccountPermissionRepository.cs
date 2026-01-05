using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class AccountPermissionRepository : IAccountPermissionRepository
    {
        private readonly AppDbContext _context;

        public AccountPermissionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<AccountPermission>> GetAccountPermissionsAsync(int accountId)
        {
            var now = DateTime.UtcNow;
            return await _context.AccountPermissions
                .Include(ap => ap.Permission)
                .Where(ap => ap.account_id == accountId &&
                    (ap.expires_at == null || ap.expires_at > now))
                .OrderBy(ap => ap.Permission.module)
                .ThenBy(ap => ap.Permission.permission_name)
                .ToListAsync();
        }

        public async Task<AccountPermission?> GetAccountPermissionAsync(int accountId, int permissionId)
        {
            var now = DateTime.UtcNow;
            return await _context.AccountPermissions
                .Include(ap => ap.Permission)
                .FirstOrDefaultAsync(ap => ap.account_id == accountId &&
                    ap.permission_id == permissionId &&
                    (ap.expires_at == null || ap.expires_at > now));
        }

        public async Task<AccountPermission> GrantPermissionAsync(int accountId, int permissionId, DateTime? expiresAt = null, string? assignedBy = null, string? reason = null)
        {
            // Check if permission override already exists
            var existing = await _context.AccountPermissions
                .FirstOrDefaultAsync(ap => ap.account_id == accountId && ap.permission_id == permissionId);

            if (existing != null)
            {
                // Update existing
                existing.is_granted = true;
                existing.assigned_at = DateTime.UtcNow;
                existing.expires_at = expiresAt;
                existing.assigned_by = assignedBy;
                existing.reason = reason;

                await _context.SaveChangesAsync();
                return existing;
            }

            // Create new grant
            var accountPermission = new AccountPermission
            {
                account_id = accountId,
                permission_id = permissionId,
                is_granted = true,
                assigned_at = DateTime.UtcNow,
                expires_at = expiresAt,
                assigned_by = assignedBy,
                reason = reason
            };

            _context.AccountPermissions.Add(accountPermission);
            await _context.SaveChangesAsync();

            // Load navigation properties
            await _context.Entry(accountPermission)
                .Reference(ap => ap.Permission)
                .LoadAsync();

            return accountPermission;
        }

        public async Task<AccountPermission> RevokePermissionAsync(int accountId, int permissionId, string? assignedBy = null, string? reason = null)
        {
            // Check if permission override already exists
            var existing = await _context.AccountPermissions
                .FirstOrDefaultAsync(ap => ap.account_id == accountId && ap.permission_id == permissionId);

            if (existing != null)
            {
                // Update existing to revoke
                existing.is_granted = false;
                existing.assigned_at = DateTime.UtcNow;
                existing.assigned_by = assignedBy;
                existing.reason = reason;

                await _context.SaveChangesAsync();
                return existing;
            }

            // Create new revoke
            var accountPermission = new AccountPermission
            {
                account_id = accountId,
                permission_id = permissionId,
                is_granted = false,
                assigned_at = DateTime.UtcNow,
                assigned_by = assignedBy,
                reason = reason
            };

            _context.AccountPermissions.Add(accountPermission);
            await _context.SaveChangesAsync();

            // Load navigation properties
            await _context.Entry(accountPermission)
                .Reference(ap => ap.Permission)
                .LoadAsync();

            return accountPermission;
        }

        public async Task<bool> RemovePermissionAsync(int accountId, int permissionId)
        {
            var accountPermission = await _context.AccountPermissions
                .FirstOrDefaultAsync(ap => ap.account_id == accountId && ap.permission_id == permissionId);

            if (accountPermission == null)
            {
                return false;
            }

            _context.AccountPermissions.Remove(accountPermission);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<IEnumerable<AccountPermission>> GetExpiredPermissionsAsync()
        {
            var now = DateTime.UtcNow;
            return await _context.AccountPermissions
                .Include(ap => ap.Permission)
                .Include(ap => ap.Account)
                .Where(ap => ap.expires_at != null && ap.expires_at <= now)
                .ToListAsync();
        }

        public async Task<int> RemoveExpiredPermissionsAsync()
        {
            var now = DateTime.UtcNow;
            var expiredPermissions = await _context.AccountPermissions
                .Where(ap => ap.expires_at != null && ap.expires_at <= now)
                .ToListAsync();

            if (expiredPermissions.Any())
            {
                _context.AccountPermissions.RemoveRange(expiredPermissions);
                await _context.SaveChangesAsync();
            }

            return expiredPermissions.Count;
        }
    }
}
