using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Interfaces;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Application.Services
{
    public class AdminActivityLogService : IAdminActivityLogService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AdminActivityLogService> _logger;

        public AdminActivityLogService(
            AppDbContext context,
            ILogger<AdminActivityLogService> logger
        )
        {
            _context = context;
            _logger = logger;
        }

        public async Task LogActivityAsync(
            int adminAccountId,
            string action,
            string entityType,
            int? entityId = null,
            string? entityName = null,
            string? details = null,
            string? ipAddress = null,
            string status = "success"
        )
        {
            try
            {
                // Lấy thông tin admin
                var admin = await _context.Accounts
                    .Include(a => a.User)
                    .FirstOrDefaultAsync(a => a.account_id == adminAccountId);

                if (admin == null)
                {
                    _logger.LogWarning($"Admin account {adminAccountId} not found");
                    return;
                }                var log = new AdminActivityLog
                {
                    AdminAccountId = adminAccountId,
                    AdminName = admin.User?.full_name ?? admin.email?.ToString() ?? "Unknown",
                    AdminEmail = admin.email?.ToString() ?? "unknown@email.com",
                    Action = action,
                    EntityType = entityType,
                    EntityId = entityId,
                    EntityName = entityName,
                    Details = details,
                    IpAddress = ipAddress,
                    Status = status,
                    Timestamp = DateTime.UtcNow
                };

                _context.AdminActivityLogs.Add(log);
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    $"Admin activity logged: {admin.email} - {action} - {entityType}"
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging admin activity");
                // Không throw exception để không ảnh hưởng đến luồng chính
            }
        }

        public async Task<AdminActivityLogListDto> GetActivityLogsAsync(
            int page = 1,
            int pageSize = 20,
            string? actionType = null,
            string? adminEmail = null,
            int? days = null,
            string? search = null
        )
        {
            var query = _context.AdminActivityLogs.AsQueryable();

            // Filter theo loại action
            if (!string.IsNullOrEmpty(actionType) && actionType != "all")
            {
                query = query.Where(log => log.EntityType == actionType);
            }

            // Filter theo admin email
            if (!string.IsNullOrEmpty(adminEmail))
            {
                query = query.Where(log => log.AdminEmail == adminEmail);
            }

            // Filter theo thời gian
            if (days.HasValue && days.Value > 0)
            {
                var cutoffDate = DateTime.UtcNow.AddDays(-days.Value);
                query = query.Where(log => log.Timestamp >= cutoffDate);
            }

            // Search
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(log =>
                    log.Action.ToLower().Contains(searchLower) ||
                    log.AdminName.ToLower().Contains(searchLower) ||
                    log.AdminEmail.ToLower().Contains(searchLower) ||
                    (log.EntityName != null && log.EntityName.ToLower().Contains(searchLower))
                );
            }

            // Count total
            var total = await query.CountAsync();

            // Pagination
            var logs = await query
                .OrderByDescending(log => log.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(log => new AdminActivityLogDto
                {
                    Id = log.Id,
                    AdminName = log.AdminName,
                    AdminEmail = log.AdminEmail,
                    Action = log.Action,
                    EntityType = log.EntityType,
                    EntityId = log.EntityId,
                    EntityName = log.EntityName,
                    Details = log.Details,
                    IpAddress = log.IpAddress,
                    Status = log.Status,
                    Timestamp = log.Timestamp
                })
                .ToListAsync();

            return new AdminActivityLogListDto
            {
                Logs = logs,
                Total = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)total / pageSize)
            };
        }

        public async Task<AdminActivityStatsDto> GetActivityStatsAsync(int days = 7)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-days);
            var last24Hours = DateTime.UtcNow.AddDays(-1);

            var logs = await _context.AdminActivityLogs
                .Where(log => log.Timestamp >= cutoffDate)
                .ToListAsync();

            var totalActions = logs.Count;
            var activeAdmins = logs.Select(log => log.AdminEmail).Distinct().Count();
            var last24HoursCount = logs.Count(log => log.Timestamp >= last24Hours);
            var averagePerDay = days > 0 ? totalActions / days : 0;

            var topActions = logs
                .GroupBy(log => log.Action)
                .Select(g => new TopActionDto
                {
                    Action = g.Key,
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToList();

            return new AdminActivityStatsDto
            {
                TotalActions = totalActions,
                ActiveAdmins = activeAdmins,
                Last24Hours = last24HoursCount,
                AveragePerDay = averagePerDay,
                TopActions = topActions
            };
        }

        public async Task<ActiveAdminsListDto> GetActiveAdminsAsync(int days = 7)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-days);

            var activeAdmins = await _context.AdminActivityLogs
                .Where(log => log.Timestamp >= cutoffDate)
                .GroupBy(log => new { log.AdminEmail, log.AdminName })
                .Select(g => new ActiveAdminDto
                {
                    Email = g.Key.AdminEmail,
                    Name = g.Key.AdminName,
                    ActionCount = g.Count()
                })
                .OrderByDescending(a => a.ActionCount)
                .ToListAsync();

            return new ActiveAdminsListDto
            {
                Admins = activeAdmins
            };
        }

        public async Task<byte[]> ExportActivityLogsAsync(
            DateTime startDate,
            DateTime endDate,
            string format = "csv"
        )
        {
            var logs = await _context.AdminActivityLogs
                .Where(log => log.Timestamp >= startDate && log.Timestamp <= endDate)
                .OrderByDescending(log => log.Timestamp)
                .ToListAsync();

            return format.ToLower() switch
            {
                "csv" => ExportToCsv(logs),
                "json" => ExportToJson(logs),
                "pdf" => ExportToPdf(logs),
                _ => ExportToCsv(logs)
            };
        }

        private byte[] ExportToCsv(List<AdminActivityLog> logs)
        {
            var csv = new StringBuilder();
            
            // Header
            csv.AppendLine("ID,Admin Name,Admin Email,Action,Entity Type,Entity Name,Details,IP Address,Status,Timestamp");

            // Data
            foreach (var log in logs)
            {
                csv.AppendLine($"{log.Id}," +
                    $"\"{log.AdminName}\"," +
                    $"\"{log.AdminEmail}\"," +
                    $"\"{log.Action}\"," +
                    $"\"{log.EntityType}\"," +
                    $"\"{log.EntityName ?? ""}\"," +
                    $"\"{log.Details ?? ""}\"," +
                    $"\"{log.IpAddress ?? ""}\"," +
                    $"\"{log.Status}\"," +
                    $"\"{log.Timestamp:yyyy-MM-dd HH:mm:ss}\"");
            }

            return Encoding.UTF8.GetBytes(csv.ToString());
        }

        private byte[] ExportToJson(List<AdminActivityLog> logs)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(logs, new System.Text.Json.JsonSerializerOptions
            {
                WriteIndented = true
            });

            return Encoding.UTF8.GetBytes(json);
        }

        private byte[] ExportToPdf(List<AdminActivityLog> logs)
        {
            // TODO: Implement PDF export using a library like iTextSharp or QuestPDF
            // For now, return CSV format
            return ExportToCsv(logs);
        }
    }
}
