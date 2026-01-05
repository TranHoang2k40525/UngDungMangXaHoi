using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Services
{
    /// <summary>
    /// Service for RBAC authorization with caching
    /// </summary>
    public class AuthorizationService : IAuthorizationService
    {
        private readonly AppDbContext _context;
        private readonly IMemoryCache _cache;
        private const int CACHE_MINUTES = 15;

        public AuthorizationService(AppDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<bool> HasPermissionAsync(int accountId, string permissionName)
        {
            var permissions = await GetAccountPermissionsAsync(accountId);
            return permissions.Contains(permissionName);
        }

        public async Task<bool> HasAnyPermissionAsync(int accountId, params string[] permissionNames)
        {
            var permissions = await GetAccountPermissionsAsync(accountId);
            return permissionNames.Any(p => permissions.Contains(p));
        }

        public async Task<bool> HasAllPermissionsAsync(int accountId, params string[] permissionNames)
        {
            var permissions = await GetAccountPermissionsAsync(accountId);
            return permissionNames.All(p => permissions.Contains(p));
        }

        public async Task<IEnumerable<string>> GetAccountPermissionsAsync(int accountId)
        {
            var cacheKey = $"permissions_{accountId}";
            
            if (_cache.TryGetValue(cacheKey, out IEnumerable<string>? cachedPermissions) && cachedPermissions != null)
            {
                return cachedPermissions;
            }

            var now = DateTime.UtcNow;

            // Get permissions from active roles
            var rolePermissions = await _context.AccountRoles
                .Where(ar => ar.account_id == accountId 
                    && ar.is_active 
                    && (ar.expires_at == null || ar.expires_at > now))
                .Join(_context.RolePermissions,
                    ar => ar.role_id,
                    rp => rp.role_id,
                    (ar, rp) => rp.permission_id)
                .Join(_context.Permissions,
                    permId => permId,
                    p => p.permission_id,
                    (permId, p) => p.permission_name)
                .Distinct()
                .ToListAsync();

            // Get account-specific permission grants
            var grantedPermissions = await _context.AccountPermissions
                .Where(ap => ap.account_id == accountId 
                    && ap.is_granted 
                    && (ap.expires_at == null || ap.expires_at > now))
                .Join(_context.Permissions,
                    ap => ap.permission_id,
                    p => p.permission_id,
                    (ap, p) => p.permission_name)
                .ToListAsync();

            // Get account-specific permission revokes
            var revokedPermissions = await _context.AccountPermissions
                .Where(ap => ap.account_id == accountId 
                    && !ap.is_granted 
                    && (ap.expires_at == null || ap.expires_at > now))
                .Join(_context.Permissions,
                    ap => ap.permission_id,
                    p => p.permission_id,
                    (ap, p) => p.permission_name)
                .ToListAsync();

            // Combine: (Role permissions + Grants) - Revokes
            var allPermissions = rolePermissions
                .Union(grantedPermissions)
                .Except(revokedPermissions)
                .Distinct()
                .ToList();

            _cache.Set(cacheKey, allPermissions, TimeSpan.FromMinutes(CACHE_MINUTES));

            return allPermissions;
        }

        public async Task<bool> HasRoleAsync(int accountId, string roleName)
        {
            var roles = await GetAccountRolesAsync(accountId);
            return roles.Contains(roleName);
        }

        public async Task<bool> HasAnyRoleAsync(int accountId, params string[] roleNames)
        {
            var roles = await GetAccountRolesAsync(accountId);
            return roleNames.Any(r => roles.Contains(r));
        }

        public async Task<IEnumerable<string>> GetAccountRolesAsync(int accountId)
        {
            var cacheKey = $"roles_{accountId}";
            
            if (_cache.TryGetValue(cacheKey, out IEnumerable<string>? cachedRoles) && cachedRoles != null)
            {
                return cachedRoles;
            }

            var now = DateTime.UtcNow;

            var roles = await _context.AccountRoles
                .Where(ar => ar.account_id == accountId 
                    && ar.is_active 
                    && (ar.expires_at == null || ar.expires_at > now))
                .Join(_context.Roles,
                    ar => ar.role_id,
                    r => r.role_id,
                    (ar, r) => r.role_name)
                .Distinct()
                .ToListAsync();

            _cache.Set(cacheKey, roles, TimeSpan.FromMinutes(CACHE_MINUTES));

            return roles;
        }

        public async Task<string?> GetPrimaryRoleAsync(int accountId)
        {
            var cacheKey = $"primary_role_{accountId}";
            
            if (_cache.TryGetValue(cacheKey, out string? cachedRole))
            {
                return cachedRole;
            }

            var now = DateTime.UtcNow;

            var primaryRole = await _context.AccountRoles
                .Where(ar => ar.account_id == accountId 
                    && ar.is_active 
                    && (ar.expires_at == null || ar.expires_at > now))
                .Join(_context.Roles,
                    ar => ar.role_id,
                    r => r.role_id,
                    (ar, r) => new { r.role_name, r.priority })
                .OrderByDescending(x => x.priority)
                .Select(x => x.role_name)
                .FirstOrDefaultAsync();

            if (primaryRole != null)
            {
                _cache.Set(cacheKey, primaryRole, TimeSpan.FromMinutes(CACHE_MINUTES));
            }

            return primaryRole;
        }

        /// <summary>
        /// Clear cache for account (call after role/permission changes)
        /// </summary>
        public void ClearCache(int accountId)
        {
            _cache.Remove($"permissions_{accountId}");
            _cache.Remove($"roles_{accountId}");
            _cache.Remove($"primary_role_{accountId}");
        }
    }
}
