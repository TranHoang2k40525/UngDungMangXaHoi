using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Domain.Entities
{
    /// <summary>
    /// Entity đại diện cho vai trò trong hệ thống RBAC
    /// Roles: Admin, User, Business, và có thể mở rộng thêm
    /// </summary>
    public class Role
    {
        public int role_id { get; set; }
        
        /// <summary>
        /// Tên role: Admin, User, Business, Moderator, v.v.
        /// </summary>
        public string role_name { get; set; } = null!;
        
        /// <summary>
        /// Mô tả chi tiết về role
        /// </summary>
        public string? description { get; set; }
        
        /// <summary>
        /// Role có thể được gán cho user hay không (system roles như SuperAdmin có thể false)
        /// </summary>
        public bool is_assignable { get; set; } = true;
        
        /// <summary>
        /// Thứ tự ưu tiên của role (số càng lớn càng cao quyền)
        /// Admin: 100, Business: 50, User: 10
        /// </summary>
        public int priority { get; set; } = 0;
        
        public DateTime created_at { get; set; } = DateTime.UtcNow;
        public DateTime updated_at { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<AccountRole> AccountRoles { get; set; } = new List<AccountRole>();
        public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }
}
