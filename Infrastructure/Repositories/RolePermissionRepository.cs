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
    public class RolePermissionRepository : IRolePermissionRepository
    {
        private readonly AppDbContext _context;

        public RolePermissionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Permission>> GetRolePermissionsAsync(int roleId)
        {
            return await _context.RolePermissions
                .Where(rp => rp.role_id == roleId)
                .Include(rp => rp.Permission)
                .Select(rp => rp.Permission)
                .OrderBy(p => p.module)
                .ThenBy(p => p.permission_name)
                .ToListAsync();
        }

        public async Task<IEnumerable<Permission>> GetRolePermissionsByNameAsync(string roleName)
        {
            return await _context.RolePermissions
                .Include(rp => rp.Role)
                .Include(rp => rp.Permission)
                .Where(rp => rp.Role.role_name == roleName)
                .Select(rp => rp.Permission)
                .OrderBy(p => p.module)
                .ThenBy(p => p.permission_name)
                .ToListAsync();
        }

        public async Task<bool> RoleHasPermissionAsync(int roleId, string permissionName)
        {
            return await _context.RolePermissions
                .Include(rp => rp.Permission)
                .AnyAsync(rp => rp.role_id == roleId && 
                    rp.Permission.permission_name == permissionName);
        }

        public async Task<RolePermission> GrantPermissionAsync(int roleId, int permissionId, string? grantedBy = null)
        {
            // Check if permission already granted
            var existing = await _context.RolePermissions
                .FirstOrDefaultAsync(rp => rp.role_id == roleId && rp.permission_id == permissionId);

            if (existing != null)
            {
                return existing;
            }

            // Create new grant
            var rolePermission = new RolePermission
            {
                role_id = roleId,
                permission_id = permissionId,
                granted_at = DateTime.UtcNow,
                granted_by = grantedBy
            };

            _context.RolePermissions.Add(rolePermission);
            await _context.SaveChangesAsync();

            // Load navigation properties
            await _context.Entry(rolePermission)
                .Reference(rp => rp.Role)
                .LoadAsync();
            await _context.Entry(rolePermission)
                .Reference(rp => rp.Permission)
                .LoadAsync();

            return rolePermission;
        }

        public async Task<bool> RevokePermissionAsync(int roleId, int permissionId)
        {
            var rolePermission = await _context.RolePermissions
                .FirstOrDefaultAsync(rp => rp.role_id == roleId && rp.permission_id == permissionId);

            if (rolePermission == null)
            {
                return false;
            }

            _context.RolePermissions.Remove(rolePermission);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<int> GrantMultiplePermissionsAsync(int roleId, IEnumerable<int> permissionIds, string? grantedBy = null)
        {
            if (permissionIds == null || !permissionIds.Any())
            {
                return 0;
            }

            var permissionIdsList = permissionIds.ToList();
            
            // Get existing permissions
            var existingPermissions = await _context.RolePermissions
                .Where(rp => rp.role_id == roleId && permissionIdsList.Contains(rp.permission_id))
                .Select(rp => rp.permission_id)
                .ToListAsync();

            // Add only new permissions
            var newPermissions = permissionIdsList
                .Except(existingPermissions)
                .Select(permissionId => new RolePermission
                {
                    role_id = roleId,
                    permission_id = permissionId,
                    granted_at = DateTime.UtcNow,
                    granted_by = grantedBy
                })
                .ToList();

            if (newPermissions.Any())
            {
                _context.RolePermissions.AddRange(newPermissions);
                await _context.SaveChangesAsync();
            }

            return newPermissions.Count;
        }

        public async Task<int> RevokeMultiplePermissionsAsync(int roleId, IEnumerable<int> permissionIds)
        {
            if (permissionIds == null || !permissionIds.Any())
            {
                return 0;
            }

            var permissionIdsList = permissionIds.ToList();
            
            var rolePermissions = await _context.RolePermissions
                .Where(rp => rp.role_id == roleId && permissionIdsList.Contains(rp.permission_id))
                .ToListAsync();

            if (rolePermissions.Any())
            {
                _context.RolePermissions.RemoveRange(rolePermissions);
                await _context.SaveChangesAsync();
            }

            return rolePermissions.Count;
        }
    }
}
