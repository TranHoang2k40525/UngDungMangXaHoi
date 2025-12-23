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
            
            // ƯU TIÊN đọc từ Environment Variables (.env file), fallback sang appsettings.json
            _accessSecret = Environment.GetEnvironmentVariable("JWT_ACCESS_SECRET") 
                ?? configuration["JwtSettings:AccessSecret"] 
                ?? throw new ArgumentNullException("JWT_ACCESS_SECRET not found in .env or appsettings");
            
            _refreshSecret = Environment.GetEnvironmentVariable("REFRESH_TOKEN_SECRET") 
                ?? configuration["JwtSettings:RefreshSecret"] 
                ?? throw new ArgumentNullException("REFRESH_TOKEN_SECRET not found in .env or appsettings");
            
            _issuer = Environment.GetEnvironmentVariable("JWT_ISSUER") 
                ?? configuration["JwtSettings:Issuer"] 
                ?? "UngDungMangXaHoi";
            
            _audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") 
                ?? configuration["JwtSettings:Audience"] 
                ?? "UngDungMangXaHoi";
                
            Console.WriteLine($"[JWT CONFIG] AccessSecret length: {_accessSecret.Length}");
            Console.WriteLine($"[JWT CONFIG] RefreshSecret length: {_refreshSecret.Length}");
            Console.WriteLine($"[JWT CONFIG] Issuer: {_issuer}");
            Console.WriteLine($"[JWT CONFIG] Audience: {_audience}");
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
                new Claim("account_type", account.account_type.ToString()),
                new Claim("user_id", account.User?.user_id.ToString() ?? "0")
            };

            var now = DateTime.UtcNow;
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                NotBefore = now,
                Expires = now.AddHours(1),
                IssuedAt = now,
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

            var now = DateTime.UtcNow;
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                NotBefore = now,
                Expires = now.AddDays(30),
                IssuedAt = now,
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

            Console.WriteLine($"[JWT VALIDATE] Validating token with AccessSecret length: {_accessSecret.Length}");
            Console.WriteLine($"[JWT VALIDATE] Token (first 50 chars): {token.Substring(0, Math.Min(50, token.Length))}...");

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
                Console.WriteLine("[JWT VALIDATE] Validation SUCCESS");
                return principal;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[JWT VALIDATE] Validation FAILED: {ex.Message}");
                return null;
            }
        }
    }
}