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
    public class AccountRoleRepository : IAccountRoleRepository
    {
        private readonly AppDbContext _context;

        public AccountRoleRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<AccountRole>> GetAccountRolesAsync(int accountId, bool activeOnly = true)
        {
            var query = _context.AccountRoles
                .Include(ar => ar.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
                .Where(ar => ar.account_id == accountId);

            if (activeOnly)
            {
                var now = DateTime.UtcNow;
                query = query.Where(ar => ar.is_active && 
                    (ar.expires_at == null || ar.expires_at > now));
            }

            return await query.OrderByDescending(ar => ar.Role.priority).ToListAsync();
        }

        public async Task<IEnumerable<AccountRole>> GetRoleAccountsAsync(int roleId)
        {
            return await _context.AccountRoles
                .Include(ar => ar.Account)
                .Include(ar => ar.Role)
                .Where(ar => ar.role_id == roleId && ar.is_active)
                .ToListAsync();
        }

        public async Task<bool> HasRoleAsync(int accountId, string roleName)
        {
            var now = DateTime.UtcNow;
            return await _context.AccountRoles
                .Include(ar => ar.Role)
                .AnyAsync(ar => ar.account_id == accountId &&
                    ar.Role.role_name == roleName &&
                    ar.is_active &&
                    (ar.expires_at == null || ar.expires_at > now));
        }

        public async Task<bool> HasAnyRoleAsync(int accountId, params string[] roleNames)
        {
            if (roleNames == null || roleNames.Length == 0)
            {
                return false;
            }

            var now = DateTime.UtcNow;
            return await _context.AccountRoles
                .Include(ar => ar.Role)
                .AnyAsync(ar => ar.account_id == accountId &&
                    roleNames.Contains(ar.Role.role_name) &&
                    ar.is_active &&
                    (ar.expires_at == null || ar.expires_at > now));
        }

        public async Task<AccountRole> AssignRoleAsync(int accountId, int roleId, DateTime? expiresAt = null, string? assignedBy = null)
        {
            // Check if assignment already exists
            var existing = await _context.AccountRoles
                .FirstOrDefaultAsync(ar => ar.account_id == accountId && ar.role_id == roleId);

            if (existing != null)
            {
                // Reactivate if exists
                existing.is_active = true;
                existing.assigned_at = DateTime.UtcNow;
                existing.expires_at = expiresAt;
                existing.assigned_by = assignedBy;
                
                await _context.SaveChangesAsync();
                return existing;
            }

            // Create new assignment
            var accountRole = new AccountRole
            {
                account_id = accountId,
                role_id = roleId,
                assigned_at = DateTime.UtcNow,
                expires_at = expiresAt,
                is_active = true,
                assigned_by = assignedBy
            };

            _context.AccountRoles.Add(accountRole);
            await _context.SaveChangesAsync();

            // Load navigation properties
            await _context.Entry(accountRole)
                .Reference(ar => ar.Role)
                .LoadAsync();

            return accountRole;
        }

        public async Task<bool> RemoveRoleAsync(int accountId, int roleId)
        {
            var accountRole = await _context.AccountRoles
                .FirstOrDefaultAsync(ar => ar.account_id == accountId && ar.role_id == roleId);

            if (accountRole == null)
            {
                return false;
            }

            _context.AccountRoles.Remove(accountRole);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> DeactivateRoleAsync(int accountId, int roleId)
        {
            var accountRole = await _context.AccountRoles
                .FirstOrDefaultAsync(ar => ar.account_id == accountId && ar.role_id == roleId);

            if (accountRole == null)
            {
                return false;
            }

            accountRole.is_active = false;
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> ActivateRoleAsync(int accountId, int roleId)
        {
            var accountRole = await _context.AccountRoles
                .FirstOrDefaultAsync(ar => ar.account_id == accountId && ar.role_id == roleId);

            if (accountRole == null)
            {
                return false;
            }

            accountRole.is_active = true;
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> UpdateExpirationAsync(int accountId, int roleId, DateTime? expiresAt)
        {
            var accountRole = await _context.AccountRoles
                .FirstOrDefaultAsync(ar => ar.account_id == accountId && ar.role_id == roleId);

            if (accountRole == null)
            {
                return false;
            }

            accountRole.expires_at = expiresAt;
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<IEnumerable<AccountRole>> GetExpiredRolesAsync()
        {
            var now = DateTime.UtcNow;
            return await _context.AccountRoles
                .Include(ar => ar.Role)
                .Include(ar => ar.Account)
                .Where(ar => ar.is_active && 
                    ar.expires_at != null && 
                    ar.expires_at <= now)
                .ToListAsync();
        }

        public async Task<int> DeactivateExpiredRolesAsync()
        {
            var now = DateTime.UtcNow;
            var expiredRoles = await _context.AccountRoles
                .Where(ar => ar.is_active && 
                    ar.expires_at != null && 
                    ar.expires_at <= now)
                .ToListAsync();

            foreach (var role in expiredRoles)
            {
                role.is_active = false;
            }

            await _context.SaveChangesAsync();
            return expiredRoles.Count;
        }
    }
}
