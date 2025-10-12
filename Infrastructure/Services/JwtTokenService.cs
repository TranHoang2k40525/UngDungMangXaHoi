using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using UngDungMangXaHoi.Domain.Entities;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Infrastructure.Services
{
    public class JwtTokenService
    {
        private readonly IConfiguration _configuration;
        private readonly string _accessSecret;
        private readonly string _refreshSecret;
        private readonly string _issuer;
        private readonly string _audience;

        public JwtTokenService(IConfiguration configuration)
        {
            _configuration = configuration;
            _accessSecret = configuration["JwtSettings:AccessSecret"] ?? throw new ArgumentNullException(nameof(configuration));
            _refreshSecret = configuration["JwtSettings:RefreshSecret"] ?? throw new ArgumentNullException(nameof(configuration));
            _issuer = configuration["JwtSettings:Issuer"] ?? throw new ArgumentNullException(nameof(configuration));
            _audience = configuration["JwtSettings:Audience"] ?? throw new ArgumentNullException(nameof(configuration));
        }

        public string GenerateAccessToken(Account account)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_accessSecret);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, account.account_id.ToString()),
                new Claim(ClaimTypes.Email, account.email?.Value ?? string.Empty),
                new Claim(ClaimTypes.Role, account.account_type.ToString()),
                new Claim("account_type", account.account_type.ToString())
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTimeOffset.UtcNow.AddHours(1).DateTime,
                Issuer = _issuer,
                Audience = _audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public string GenerateRefreshToken(Account account)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_refreshSecret);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, account.account_id.ToString()),
                new Claim("account_type", account.account_type.ToString())
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTimeOffset.UtcNow.AddDays(30).DateTime,
                Issuer = _issuer,
                Audience = _audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public ClaimsPrincipal? ValidateToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_accessSecret);

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            try
            {
                var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
                return principal;
            }
            catch
            {
                return null;
            }
        }
    }
}