using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using RbacAuthService = UngDungMangXaHoi.Domain.Interfaces.IAuthorizationService;

namespace UngDungMangXaHoi.Presentation.WebAPI.Attributes
{
    /// <summary>
    /// Attribute to check if user has required permission
    /// Usage: [RequirePermission("posts.create")]
    /// </summary>
    public class RequirePermissionAttribute : TypeFilterAttribute
    {
        public RequirePermissionAttribute(params string[] permissions) 
            : base(typeof(PermissionFilter))
        {
            Arguments = new object[] { permissions };
        }

        private class PermissionFilter : IAsyncAuthorizationFilter
        {
            private readonly string[] _permissions;
            private readonly RbacAuthService _authService;

            public PermissionFilter(string[] permissions, RbacAuthService authService)
            {
                _permissions = permissions;
                _authService = authService;
            }

            public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
            {
                // Check if user is authenticated
                if (!context.HttpContext.User.Identity?.IsAuthenticated ?? true)
                {
                    context.Result = new UnauthorizedResult();
                    return;
                }

                // Get account ID from claims
                var accountIdClaim = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier);
                if (accountIdClaim == null || !int.TryParse(accountIdClaim.Value, out var accountId))
                {
                    context.Result = new UnauthorizedResult();
                    return;
                }

                // Check if user has any of the required permissions
                var hasPermission = await _authService.HasAnyPermissionAsync(accountId, _permissions);

                if (!hasPermission)
                {
                    context.Result = new ForbidResult();
                    return;
                }
            }
        }
    }

    /// <summary>
    /// Attribute to check if user has required role
    /// Usage: [RequireRole("Admin", "User")]
    /// </summary>
    public class RequireRoleAttribute : TypeFilterAttribute
    {
        public RequireRoleAttribute(params string[] roles) 
            : base(typeof(RoleFilter))
        {
            Arguments = new object[] { roles };
        }

        private class RoleFilter : IAsyncAuthorizationFilter
        {
            private readonly string[] _roles;
            private readonly RbacAuthService _authService;

            public RoleFilter(string[] roles, RbacAuthService authService)
            {
                _roles = roles;
                _authService = authService;
            }

            public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
            {
                // Check if user is authenticated
                if (!context.HttpContext.User.Identity?.IsAuthenticated ?? true)
                {
                    context.Result = new UnauthorizedResult();
                    return;
                }

                // Get account ID from claims
                var accountIdClaim = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier);
                if (accountIdClaim == null || !int.TryParse(accountIdClaim.Value, out var accountId))
                {
                    context.Result = new UnauthorizedResult();
                    return;
                }

                // Check if user has any of the required roles
                var hasRole = await _authService.HasAnyRoleAsync(accountId, _roles);

                if (!hasRole)
                {
                    context.Result = new ForbidResult();
                    return;
                }
            }
        }
    }

    /// <summary>
    /// Attribute to check if user has ALL required permissions
    /// Usage: [RequireAllPermissions("posts.create", "posts.edit")]
    /// </summary>
    public class RequireAllPermissionsAttribute : TypeFilterAttribute
    {
        public RequireAllPermissionsAttribute(params string[] permissions) 
            : base(typeof(AllPermissionsFilter))
        {
            Arguments = new object[] { permissions };
        }

        private class AllPermissionsFilter : IAsyncAuthorizationFilter
        {
            private readonly string[] _permissions;
            private readonly RbacAuthService _authService;

            public AllPermissionsFilter(string[] permissions, RbacAuthService authService)
            {
                _permissions = permissions;
                _authService = authService;
            }

            public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
            {
                // Check if user is authenticated
                if (!context.HttpContext.User.Identity?.IsAuthenticated ?? true)
                {
                    context.Result = new UnauthorizedResult();
                    return;
                }

                // Get account ID from claims
                var accountIdClaim = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier);
                if (accountIdClaim == null || !int.TryParse(accountIdClaim.Value, out var accountId))
                {
                    context.Result = new UnauthorizedResult();
                    return;
                }

                // Check if user has ALL required permissions
                var hasAllPermissions = await _authService.HasAllPermissionsAsync(accountId, _permissions);

                if (!hasAllPermissions)
                {
                    context.Result = new ForbidResult();
                    return;
                }
            }
        }
    }
}
