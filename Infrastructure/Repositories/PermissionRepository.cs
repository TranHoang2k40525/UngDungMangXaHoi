using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class PermissionRepository : IPermissionRepository
    {
        private readonly AppDbContext _context;

        public PermissionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Permission?> GetByIdAsync(int permissionId)
        {
            return await _context.Permissions
                .FirstOrDefaultAsync(p => p.permission_id == permissionId);
        }

        public async Task<Permission?> GetByNameAsync(string permissionName)
        {
            return await _context.Permissions
                .FirstOrDefaultAsync(p => p.permission_name == permissionName);
        }

        public async Task<IEnumerable<Permission>> GetAllAsync()
        {
            return await _context.Permissions
                .OrderBy(p => p.module)
                .ThenBy(p => p.permission_name)
                .ToListAsync();
        }

        public async Task<IEnumerable<Permission>> GetByModuleAsync(string module)
        {
            return await _context.Permissions
                .Where(p => p.module == module)
                .OrderBy(p => p.permission_name)
                .ToListAsync();
        }

        public async Task<Permission> CreateAsync(Permission permission)
        {
            permission.created_at = System.DateTime.UtcNow;
            permission.updated_at = System.DateTime.UtcNow;
            
            _context.Permissions.Add(permission);
            await _context.SaveChangesAsync();
            
            return permission;
        }

        public async Task<Permission> UpdateAsync(Permission permission)
        {
            permission.updated_at = System.DateTime.UtcNow;
            
            _context.Permissions.Update(permission);
            await _context.SaveChangesAsync();
            
            return permission;
        }

        public async Task<bool> DeleteAsync(int permissionId)
        {
            var permission = await _context.Permissions.FindAsync(permissionId);
            if (permission == null)
            {
                return false;
            }

            _context.Permissions.Remove(permission);
            await _context.SaveChangesAsync();
            
            return true;
        }

        public async Task<bool> ExistsAsync(string permissionName)
        {
            return await _context.Permissions
                .AnyAsync(p => p.permission_name == permissionName);
        }
    }
}
