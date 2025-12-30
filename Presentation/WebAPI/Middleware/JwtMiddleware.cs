using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using UngDungMangXaHoi.Infrastructure.Services;

namespace UngDungMangXaHoi.Presentation.WebAPI.Middleware
{
    /// <summary>
    /// JWT Middleware - tương tự authMiddleware.js trong Node.js
    /// Xác thực token và gán thông tin user vào HttpContext.User
    /// </summary>
    public class JwtMiddleware
    {
        private readonly RequestDelegate _next;

        public JwtMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context, RbacJwtTokenService jwtService)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";
            
            // Bỏ qua các endpoint public (không cần authentication)
            if (path.Contains("/login") || 
                path.Contains("/register") || 
                path.Contains("/verify-otp") ||
                path.Contains("/forgot-password") ||
                path.Contains("/verify-forgot-password-otp") ||
                path.Contains("/reset-password") ||
                path.Contains("/refresh"))
            {
                await _next(context);
                return;
            }

            try
            {
                // Lấy token từ header Authorization (Bearer token)
                var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
                Console.WriteLine($"[JWT MIDDLEWARE] Path: {path}");
                Console.WriteLine($"[JWT MIDDLEWARE] Authorization Header: {authHeader}");

                if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                {
                    Console.WriteLine("[JWT MIDDLEWARE] Missing or invalid token format");
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        message = "Không có token hoặc token không hợp lệ!",
                        code = "INVALID_TOKEN"
                    });
                    return;
                }

                var token = authHeader.Substring("Bearer ".Length).Trim();
                if (string.IsNullOrEmpty(token))
                {
                    Console.WriteLine("[JWT MIDDLEWARE] Token is empty");
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        message = "Token không được cung cấp!",
                        code = "MISSING_TOKEN"
                    });
                    return;
                }

                // Xác thực token
                var principal = jwtService.ValidateToken(token);
                
                if (principal == null)
                {
                    Console.WriteLine("[JWT MIDDLEWARE] Token validation returned null");
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        message = "Token không hợp lệ!",
                        code = "INVALID_TOKEN"
                    });
                    return;
                }

                // Lưu thông tin user vào HttpContext.User (giống req.user trong Node.js)
                context.User = principal;

                // Log thông tin user đã xác thực (RBAC)
                var accountId = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var roles = principal.FindAll(System.Security.Claims.ClaimTypes.Role).Select(c => c.Value);
                Console.WriteLine($"[JWT MIDDLEWARE] User authenticated: AccountId={accountId}, Roles={string.Join(",", roles)}");

                await _next(context);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[JWT MIDDLEWARE] Unhandled error: {ex.Message}");
                context.Response.StatusCode = 500;
                await context.Response.WriteAsJsonAsync(new
                {
                    message = "Lỗi xác thực!",
                    code = "AUTH_ERROR",
                    error = ex.Message
                });
            }
        }
    }

    // Extension method để dễ dàng đăng ký middleware
    public static class JwtMiddlewareExtensions
    {
        public static IApplicationBuilder UseJwtMiddleware(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<JwtMiddleware>();
        }
    }
}