using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Domain.Entities
{
    /// <summary>
    /// Entity đại diện cho quyền hạn cụ thể trong hệ thống
    /// Permissions được nhóm theo module và action
    /// </summary>
    public class Permission
    {
        public int permission_id { get; set; }
        
        /// <summary>
        /// Tên permission dạng code: posts.create, posts.edit, admin.users.ban, v.v.
        /// </summary>
        public string permission_name { get; set; } = null!;
        
        /// <summary>
        /// Tên hiển thị cho người dùng
        /// </summary>
        public string display_name { get; set; } = null!;
        
        /// <summary>
        /// Module/nhóm chức năng: Posts, Comments, Admin, Business, v.v.
        /// </summary>
        public string module { get; set; } = null!;
        
        /// <summary>
        /// Mô tả chi tiết về permission
        /// </summary>
        public string? description { get; set; }
        
        public DateTime created_at { get; set; } = DateTime.UtcNow;
        public DateTime updated_at { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
        public ICollection<AccountPermission> AccountPermissions { get; set; } = new List<AccountPermission>();
    }
}
