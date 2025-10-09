using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Infrastructure.Services; // { changed code }

namespace UngDungMangXaHoi.Application.Services
{
    public class AuthValidator : ITokenService
    {
        private readonly string _accessSecret;
        private readonly string _refreshSecret;
        private readonly string _issuer;
        private readonly string _audience;

        public AuthValidator(string accessSecret, string refreshSecret, string issuer, string audience)
        {
            _accessSecret = accessSecret;
            _refreshSecret = refreshSecret;
            _issuer = issuer;
            _audience = audience;
        }

        public async Task<(string AccessToken, string RefreshToken)> GenerateTokensAsync(Account account)
        {
            var accessToken = ManualJwt.GenerateAccessToken(account, _accessSecret, _issuer, _audience);
            var refreshToken = ManualJwt.GenerateRefreshToken(account, _refreshSecret);
            return (accessToken, refreshToken);
        }

        public async Task<string> GenerateOtpAsync()
        {
            var random = new Random();
            var otp = random.Next(100000, 999999).ToString();
            return otp;
        }
    }
}
