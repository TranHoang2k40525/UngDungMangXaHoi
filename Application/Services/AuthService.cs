using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Services; // { changed code }
using Microsoft.Extensions.Configuration; // { changed code }

namespace UngDungMangXaHoi.Application.Services
{
    // Replaced implementation so AuthService implements ITokenService correctly
    public class AuthService : ITokenService
    {
        private readonly string _accessSecret;
        private readonly string _refreshSecret;
        private readonly string _issuer;
        private readonly string _audience;

        // { changed code } Replace string parameters with IConfiguration
        public AuthService(IConfiguration configuration)
        {
            _accessSecret = configuration["Jwt:AccessSecret"] ?? throw new ArgumentNullException("Jwt:AccessSecret");
            _refreshSecret = configuration["Jwt:RefreshSecret"] ?? throw new ArgumentNullException("Jwt:RefreshSecret");
            _issuer = configuration["Jwt:Issuer"] ?? throw new ArgumentNullException("Jwt:Issuer");
            _audience = configuration["Jwt:Audience"] ?? throw new ArgumentNullException("Jwt:Audience");
        }

        public Task<(string AccessToken, string RefreshToken)> GenerateTokensAsync(Account account)
        {
            var accessToken = ManualJwt.GenerateAccessToken(account, _accessSecret, _issuer, _audience);
            var refreshToken = ManualJwt.GenerateRefreshToken(account, _refreshSecret);
            return Task.FromResult((accessToken, refreshToken));
        }

        public Task<string> GenerateOtpAsync()
        {
            var random = new Random();
            var otp = random.Next(100000, 999999).ToString();
            return Task.FromResult(otp);
        }
    }
}

