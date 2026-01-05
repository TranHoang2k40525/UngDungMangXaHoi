using System.Security.Claims;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Presentation.WebAPI.Extensions
{
    /// <summary>
    /// Extension methods for authorization
    /// </summary>
    public static class AuthorizationExtensions
    {
        /// <summary>
        /// Get account ID from ClaimsPrincipal
        /// </summary>
        public static int? GetAccountId(this ClaimsPrincipal user)
        {
            var accountIdClaim = user.FindFirst(ClaimTypes.NameIdentifier);
            if (accountIdClaim != null && int.TryParse(accountIdClaim.Value, out var accountId))
            {
                return accountId;
            }
            return null;
        }

        /// <summary>
        /// Check if user has permission (async)
        /// </summary>
        public static async Task<bool> HasPermissionAsync(this ClaimsPrincipal user, IAuthorizationService authService, string permission)
        {
            var accountId = user.GetAccountId();
            if (accountId == null) return false;

            return await authService.HasPermissionAsync(accountId.Value, permission);
        }

        /// <summary>
        /// Check if user has any of the permissions (async)
        /// </summary>
        public static async Task<bool> HasAnyPermissionAsync(this ClaimsPrincipal user, IAuthorizationService authService, params string[] permissions)
        {
            var accountId = user.GetAccountId();
            if (accountId == null) return false;

            return await authService.HasAnyPermissionAsync(accountId.Value, permissions);
        }

        /// <summary>
        /// Check if user has role (async)
        /// </summary>
        public static async Task<bool> HasRoleAsync(this ClaimsPrincipal user, IAuthorizationService authService, string role)
        {
            var accountId = user.GetAccountId();
            if (accountId == null) return false;

            return await authService.HasRoleAsync(accountId.Value, role);
        }

        /// <summary>
        /// Check if user has any of the roles (async)
        /// </summary>
        public static async Task<bool> HasAnyRoleAsync(this ClaimsPrincipal user, IAuthorizationService authService, params string[] roles)
        {
            var accountId = user.GetAccountId();
            if (accountId == null) return false;

            return await authService.HasAnyRoleAsync(accountId.Value, roles);
        }
    }
}
