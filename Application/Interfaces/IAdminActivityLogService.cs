using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;

namespace UngDungMangXaHoi.Application.Interfaces
{
    /// <summary>
    /// Interface cho Admin Activity Log Service
    /// </summary>
    public interface IAdminActivityLogService
    {
        /// <summary>
        /// Ghi log hoạt động của admin
        /// </summary>
        Task LogActivityAsync(
            int adminAccountId,
            string action,
            string entityType,
            int? entityId = null,
            string? entityName = null,
            string? details = null,
            string? ipAddress = null,
            string status = "success"
        );

        /// <summary>
        /// Lấy danh sách activity logs với filter và pagination
        /// </summary>
        Task<AdminActivityLogListDto> GetActivityLogsAsync(
            int page = 1,
            int pageSize = 20,
            string? actionType = null,
            string? adminEmail = null,
            int? days = null,
            string? search = null
        );

        /// <summary>
        /// Lấy thống kê activity logs
        /// </summary>
        Task<AdminActivityStatsDto> GetActivityStatsAsync(int days = 7);

        /// <summary>
        /// Lấy danh sách admin đang hoạt động
        /// </summary>
        Task<ActiveAdminsListDto> GetActiveAdminsAsync(int days = 7);

        /// <summary>
        /// Xuất báo cáo activity logs
        /// </summary>
        Task<byte[]> ExportActivityLogsAsync(
            DateTime startDate,
            DateTime endDate,
            string format = "csv"
        );
    }
}
