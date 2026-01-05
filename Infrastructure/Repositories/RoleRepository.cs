using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class RoleRepository : IRoleRepository
    {
        private readonly AppDbContext _context;

        public RoleRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Role?> GetByIdAsync(int roleId)
        {
            return await _context.Roles
                .Include(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(r => r.role_id == roleId);
        }

        public async Task<Role?> GetByNameAsync(string roleName)
        {
            return await _context.Roles
                .Include(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(r => r.role_name == roleName);
        }

        public async Task<IEnumerable<Role>> GetAllAsync()
        {
            return await _context.Roles
                .Include(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
                .OrderByDescending(r => r.priority)
                .ToListAsync();
        }

        public async Task<IEnumerable<Role>> GetAssignableRolesAsync()
        {
            return await _context.Roles
                .Where(r => r.is_assignable)
                .Include(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
                .OrderByDescending(r => r.priority)
                .ToListAsync();
        }

        public async Task<Role> CreateAsync(Role role)
        {
            role.created_at = System.DateTime.UtcNow;
            role.updated_at = System.DateTime.UtcNow;
            
            _context.Roles.Add(role);
            await _context.SaveChangesAsync();
            
            return role;
        }

        public async Task<Role> UpdateAsync(Role role)
        {
            role.updated_at = System.DateTime.UtcNow;
            
            _context.Roles.Update(role);
            await _context.SaveChangesAsync();
            
            return role;
        }

        public async Task<bool> DeleteAsync(int roleId)
        {
            var role = await _context.Roles.FindAsync(roleId);
            if (role == null)
            {
                return false;
            }

            _context.Roles.Remove(role);
            await _context.SaveChangesAsync();
            
            return true;
        }

        public async Task<bool> ExistsAsync(string roleName)
        {
            return await _context.Roles
                .AnyAsync(r => r.role_name == roleName);
        }
    }
}
