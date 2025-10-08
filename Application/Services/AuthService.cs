using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    public class AuthService : ITokenService
    {
        private readonly string _secretKey;
        private readonly string _issuer;
        private readonly string _audience;
        private readonly int _expirationMinutes;

        public AuthService(string secretKey, string issuer, string audience, int expirationMinutes = 60)
        {
            _secretKey = secretKey;
            _issuer = issuer;
            _audience = audience;
            _expirationMinutes = expirationMinutes;
        }

        public string GenerateToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_secretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.UserName.Value),
                    new Claim(ClaimTypes.Email, user.Email.Value),
                    new Claim("FirstName", user.FirstName),
                    new Claim("LastName", user.LastName)
                }),
                Expires = DateTime.UtcNow.AddMinutes(_expirationMinutes),
                Issuer = _issuer,
                Audience = _audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public bool ValidateToken(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(_secretKey);

                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _issuer,
                    ValidateAudience = true,
                    ValidAudience = _audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                return true;
            }
            catch
            {
                return false;
            }
        }

        public Guid? GetUserIdFromToken(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var jwtToken = tokenHandler.ReadJwtToken(token);

                var userIdClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == ClaimTypes.NameIdentifier);
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out Guid userId))
                {
                    return userId;
                }

                return null;
            }
            catch
            {
                return null;
            }
        }
    }
}

