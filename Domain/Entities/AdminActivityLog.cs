using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UngDungMangXaHoi.Domain.Entities
{
    /// <summary>
    /// Entity lưu trữ nhật ký hoạt động của Admin trong hệ thống
    /// </summary>
    public class AdminActivityLog
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// ID của admin thực hiện hành động
        /// </summary>
        [Required]
        public int AdminAccountId { get; set; }

        /// <summary>
        /// Tên admin (cached để query nhanh)
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string AdminName { get; set; } = string.Empty;

        /// <summary>
        /// Email admin (cached để query nhanh)
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string AdminEmail { get; set; } = string.Empty;

        /// <summary>
        /// Hành động cụ thể (Cấm người dùng, Xóa bài đăng, etc.)
        /// </summary>
        [Required]
        [MaxLength(500)]
        public string Action { get; set; } = string.Empty;

        /// <summary>
        /// Loại đối tượng bị tác động (user, post, business, comment, report, system)
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string EntityType { get; set; } = string.Empty;

        /// <summary>
        /// ID của đối tượng bị tác động
        /// </summary>
        public int? EntityId { get; set; }

        /// <summary>
        /// Tên/mô tả của đối tượng (@username, Bài đăng #123, etc.)
        /// </summary>
        [MaxLength(500)]
        public string? EntityName { get; set; }

        /// <summary>
        /// Chi tiết về hành động, lý do, ghi chú
        /// </summary>
        [MaxLength(2000)]
        public string? Details { get; set; }

        /// <summary>
        /// Địa chỉ IP của admin khi thực hiện hành động
        /// </summary>
        [MaxLength(50)]
        public string? IpAddress { get; set; }

        /// <summary>
        /// Trạng thái thực hiện (success, warning, error, info)
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "success";

        /// <summary>
        /// Thời gian thực hiện hành động
        /// </summary>
        [Required]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Dữ liệu JSON bổ sung (nếu cần)
        /// </summary>
        [Column(TypeName = "nvarchar(max)")]
        public string? AdditionalData { get; set; }

        // Navigation property
        [ForeignKey("AdminAccountId")]
        public virtual Account? Admin { get; set; }
    }

    /// <summary>
    /// Enum cho các loại đối tượng
    /// </summary>
    public static class EntityTypes
    {
        public const string User = "user";
        public const string Post = "post";
        public const string Business = "business";
        public const string Comment = "comment";
        public const string Report = "report";
        public const string System = "system";
    }

    /// <summary>
    /// Enum cho các trạng thái
    /// </summary>
    public static class ActivityStatus
    {
        public const string Success = "success";
        public const string Warning = "warning";
        public const string Error = "error";
        public const string Info = "info";
    }
}
