using System;

namespace UngDungMangXaHoi.Application.DTOs
{
    /// <summary>
    /// DTO cho Admin Activity Log response
    /// </summary>
    public class AdminActivityLogDto
    {
        public int Id { get; set; }
        public string AdminName { get; set; } = string.Empty;
        public string AdminEmail { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty;
        public int? EntityId { get; set; }
        public string? EntityName { get; set; }
        public string? Details { get; set; }
        public string? IpAddress { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }

    /// <summary>
    /// DTO cho việc tạo Admin Activity Log
    /// </summary>
    public class CreateAdminActivityLogDto
    {
        public string Action { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty;
        public int? EntityId { get; set; }
        public string? EntityName { get; set; }
        public string? Details { get; set; }
        public string Status { get; set; } = "success";
    }

    /// <summary>
    /// DTO cho danh sách Admin Activity Log với pagination
    /// </summary>
    public class AdminActivityLogListDto
    {
        public List<AdminActivityLogDto> Logs { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    /// <summary>
    /// DTO cho thống kê Admin Activity
    /// </summary>
    public class AdminActivityStatsDto
    {
        public int TotalActions { get; set; }
        public int ActiveAdmins { get; set; }
        public int Last24Hours { get; set; }
        public int AveragePerDay { get; set; }
        public List<TopActionDto>? TopActions { get; set; }
    }

    /// <summary>
    /// DTO cho top actions
    /// </summary>
    public class TopActionDto
    {
        public string Action { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    /// <summary>
    /// DTO cho active admins
    /// </summary>
    public class ActiveAdminDto
    {
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int ActionCount { get; set; }
    }

    /// <summary>
    /// DTO cho danh sách active admins
    /// </summary>
    public class ActiveAdminsListDto
    {
        public List<ActiveAdminDto> Admins { get; set; } = new();
    }
}
