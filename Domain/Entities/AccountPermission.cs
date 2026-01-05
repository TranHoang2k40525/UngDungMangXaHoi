using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    /// <summary>
    /// Bảng lưu quyền đặc biệt của từng Account (override role permissions)
    /// Dùng để grant/revoke quyền cụ thể cho một user mà không cần tạo role mới
    /// </summary>
    public class AccountPermission
    {
        public int account_permission_id { get; set; }
        public int account_id { get; set; }
        public int permission_id { get; set; }
        
        /// <summary>
        /// true = grant thêm quyền, false = revoke quyền (ngay cả khi role có quyền đó)
        /// </summary>
        public bool is_granted { get; set; } = true;
        
        /// <summary>
        /// Ngày gán/thu hồi permission
        /// </summary>
        public DateTime assigned_at { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Ngày permission hết hạn (NULL = không hết hạn)
        /// </summary>
        public DateTime? expires_at { get; set; }
        
        /// <summary>
        /// Ai gán permission này (admin_id)
        /// </summary>
        public string? assigned_by { get; set; }
        
        /// <summary>
        /// Lý do gán/thu hồi quyền
        /// </summary>
        public string? reason { get; set; }
        
        // Navigation properties
        public Account Account { get; set; } = null!;
        public Permission Permission { get; set; } = null!;
    }
}
