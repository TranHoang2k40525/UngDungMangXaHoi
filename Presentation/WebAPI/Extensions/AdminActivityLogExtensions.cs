using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using UngDungMangXaHoi.Application.Interfaces;

namespace UngDungMangXaHoi.Presentation.WebAPI.Extensions
{
    /// <summary>
    /// Extension methods để ghi admin activity log dễ dàng hơn
    /// </summary>
    public static class AdminActivityLogExtensions
    {
        /// <summary>
        /// Lấy IP address của client
        /// </summary>
        public static string? GetClientIpAddress(this HttpContext context)
        {
            // Ưu tiên lấy từ X-Forwarded-For header (khi đằng sau proxy/load balancer)
            var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwarded))
            {
                return forwarded.Split(',')[0].Trim();
            }

            // Lấy từ X-Real-IP header
            var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
            if (!string.IsNullOrEmpty(realIp))
            {
                return realIp;
            }

            // Fallback về RemoteIpAddress
            return context.Connection.RemoteIpAddress?.ToString();
        }

        /// <summary>
        /// Lấy Account ID của admin hiện tại từ JWT token
        /// </summary>
        public static int? GetAdminAccountId(this HttpContext context)
        {
            var accountIdClaim = context.User.FindFirst("account_id")?.Value 
                ?? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (int.TryParse(accountIdClaim, out var accountId))
            {
                return accountId;
            }

            return null;
        }

        /// <summary>
        /// Ghi log admin activity một cách tiện lợi
        /// </summary>
        public static async Task LogAdminActivityAsync(
            this HttpContext context,
            IAdminActivityLogService logService,
            string action,
            string entityType,
            int? entityId = null,
            string? entityName = null,
            string? details = null,
            string status = "success"
        )
        {
            var adminAccountId = context.GetAdminAccountId();
            if (!adminAccountId.HasValue)
            {
                return; // Không phải admin hoặc không có token
            }

            var ipAddress = context.GetClientIpAddress();

            await logService.LogActivityAsync(
                adminAccountId.Value,
                action,
                entityType,
                entityId,
                entityName,
                details,
                ipAddress,
                status
            );
        }
    }
}
