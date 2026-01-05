using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    /// <summary>
    /// Bảng trung gian: Một Role có nhiều Permissions
    /// Định nghĩa quyền hạn của từng role
    /// </summary>
    public class RolePermission
    {
        public int role_permission_id { get; set; }
        public int role_id { get; set; }
        public int permission_id { get; set; }
        
        /// <summary>
        /// Ngày gán permission cho role
        /// </summary>
        public DateTime granted_at { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Ai gán permission này (admin_id hoặc system)
        /// </summary>
        public string? granted_by { get; set; }
        
        // Navigation properties
        public Role Role { get; set; } = null!;
        public Permission Permission { get; set; } = null!;
    }
}
