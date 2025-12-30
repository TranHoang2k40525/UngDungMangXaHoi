using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Infrastructure.Services;

namespace UngDungMangXaHoi.Application.Services
{
    /// <summary>
    /// DEPRECATED: Use RbacJwtTokenService directly instead.
    /// This class is kept for backward compatibility only.
    /// </summary>
    public class AuthValidator : ITokenService
    {
        private readonly RbacJwtTokenService _rbacJwtService;

        public AuthValidator(RbacJwtTokenService rbacJwtService)
        {
            _rbacJwtService = rbacJwtService;
        }

        public async Task<(string AccessToken, string RefreshToken)> GenerateTokensAsync(Account account)
        {
            // Use RBAC JWT Service instead of obsolete ManualJwt
            var accessToken = await _rbacJwtService.GenerateAccessTokenAsync(account);
            var refreshToken = await _rbacJwtService.GenerateRefreshTokenAsync(account);
            return (accessToken, refreshToken);
        }

        public async Task<string> GenerateOtpAsync()
        {
            var random = new Random();
            var otp = random.Next(100000, 999999).ToString();
            return await Task.FromResult(otp);
        }
    }
}