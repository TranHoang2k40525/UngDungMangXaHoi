using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using UngDungMangXaHoi.Infrastructure.Services;

namespace UngDungMangXaHoi.Presentation.WebAPI.Middleware
{
    // Middleware này sẽ kiểm tra và xác thực JWT token trong mọi request
    public class JwtMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly JwtTokenService _jwtService;

        public JwtMiddleware(RequestDelegate next, JwtTokenService jwtService)
        {
            _next = next;
            _jwtService = jwtService;
        }

        public async Task Invoke(HttpContext context)
        {
            // Lấy token từ header Authorization
            var token = context.Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();

            if (token != null)
            {
                // Xác thực token và gán thông tin user vào context
                var principal = _jwtService.ValidateToken(token);
                if (principal != null)
                {
                    context.User = principal;
                }
            }

            await _next(context);
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