using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    /// <summary>
    /// Bảng trung gian: Một Account có thể có nhiều Roles
    /// Ví dụ: Account có thể vừa là User vừa là Business (nâng cấp)
    /// </summary>
    public class AccountRole
    {
        public int account_role_id { get; set; }
        public int account_id { get; set; }
        public int role_id { get; set; }
        
        /// <summary>
        /// Ngày gán role
        /// </summary>
        public DateTime assigned_at { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Ngày role hết hạn (dùng cho Business role với subscription)
        /// NULL = không hết hạn
        /// </summary>
        public DateTime? expires_at { get; set; }
        
        /// <summary>
        /// Role có đang active không (có thể tạm ngưng role mà không xóa)
        /// </summary>
        public bool is_active { get; set; } = true;
        
        /// <summary>
        /// Ai gán role này (admin_id hoặc system)
        /// </summary>
        public string? assigned_by { get; set; }
        
        // Navigation properties
        public Account Account { get; set; } = null!;
        public Role Role { get; set; } = null!;
    }
}
