using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Services
{
    /// <summary>
    /// Enhanced JWT Token Service with RBAC support
    /// Includes roles and permissions in JWT claims
    /// </summary>
    public class RbacJwtTokenService
    {
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;
        private readonly string _accessSecret;
        private readonly string _refreshSecret;
        private readonly string _issuer;
        private readonly string _audience;

        public RbacJwtTokenService(IConfiguration configuration, AppDbContext context)
        {
            _configuration = configuration;
            _context = context;
            
            _accessSecret = Environment.GetEnvironmentVariable("JWT_ACCESS_SECRET") 
                ?? configuration["JwtSettings:AccessSecret"] 
                ?? throw new ArgumentNullException("JWT_ACCESS_SECRET not found");
            
            _refreshSecret = Environment.GetEnvironmentVariable("REFRESH_TOKEN_SECRET") 
                ?? configuration["JwtSettings:RefreshSecret"] 
                ?? throw new ArgumentNullException("REFRESH_TOKEN_SECRET not found");
            
            _issuer = Environment.GetEnvironmentVariable("JWT_ISSUER") 
                ?? configuration["JwtSettings:Issuer"] 
                ?? "UngDungMangXaHoi";
            
            _audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") 
                ?? configuration["JwtSettings:Audience"] 
                ?? "UngDungMangXaHoi";
        }

        public async Task<string> GenerateAccessTokenAsync(Account account)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_accessSecret);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, account.account_id.ToString()),
                new Claim(ClaimTypes.Email, account.email?.Value ?? string.Empty),
                new Claim("user_id", account.User?.user_id.ToString() ?? "0")
            };

            // Get active roles
            var now = DateTime.UtcNow;
            var roles = await _context.AccountRoles
                .Where(ar => ar.account_id == account.account_id 
                    && ar.is_active 
                    && (ar.expires_at == null || ar.expires_at > now))
                .Join(_context.Roles,
                    ar => ar.role_id,
                    r => r.role_id,
                    (ar, r) => new { r.role_name, r.priority })
                .OrderByDescending(x => x.priority)
                .ToListAsync();

            // Add roles to claims
            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role.role_name));
            }

            // Add primary role (highest priority)
            if (roles.Any())
            {
                claims.Add(new Claim("primary_role", roles.First().role_name));
            }

            // RBAC: Get top permissions (limit to avoid token size issues)
            var roleIds = roles.Select(r => r.role_name).ToList();
            var permissions = await GetTopPermissionsAsync(account.account_id, roleIds, limit: 20);
            
            // Add permissions to claims (as comma-separated string)
            if (permissions.Any())
            {
                claims.Add(new Claim("permissions", string.Join(",", permissions)));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                NotBefore = DateTime.UtcNow,
                Expires = DateTime.UtcNow.AddHours(1),
                IssuedAt = DateTime.UtcNow,
                Issuer = _issuer,
                Audience = _audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public async Task<string> GenerateRefreshTokenAsync(Account account)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_refreshSecret);

            // Get primary role
            var now = DateTime.UtcNow;
            var primaryRole = await _context.AccountRoles
                .Where(ar => ar.account_id == account.account_id 
                    && ar.is_active 
                    && (ar.expires_at == null || ar.expires_at > now))
                .Join(_context.Roles,
                    ar => ar.role_id,
                    r => r.role_id,
                    (ar, r) => new { r.role_name, r.priority })
                .OrderByDescending(x => x.priority)
                .Select(x => x.role_name)
                .FirstOrDefaultAsync();

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, account.account_id.ToString())
            };

            if (primaryRole != null)
            {
                claims.Add(new Claim(ClaimTypes.Role, primaryRole));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                NotBefore = DateTime.UtcNow,
                Expires = DateTime.UtcNow.AddDays(30),
                IssuedAt = DateTime.UtcNow,
                Issuer = _issuer,
                Audience = _audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private async Task<List<string>> GetTopPermissionsAsync(int accountId, List<string> roleNames, int limit = 20)
        {
            var now = DateTime.UtcNow;

            // Get role IDs
            var roleIds = await _context.Roles
                .Where(r => roleNames.Contains(r.role_name))
                .Select(r => r.role_id)
                .ToListAsync();

            // Get permissions from roles
            var rolePermissions = await _context.RolePermissions
                .Where(rp => roleIds.Contains(rp.role_id))
                .Join(_context.Permissions,
                    rp => rp.permission_id,
                    p => p.permission_id,
                    (rp, p) => p.permission_name)
                .Distinct()
                .ToListAsync();

            // Get account-specific grants
            var grantedPermissions = await _context.AccountPermissions
                .Where(ap => ap.account_id == accountId 
                    && ap.is_granted 
                    && (ap.expires_at == null || ap.expires_at > now))
                .Join(_context.Permissions,
                    ap => ap.permission_id,
                    p => p.permission_id,
                    (ap, p) => p.permission_name)
                .ToListAsync();

            // Get account-specific revokes
            var revokedPermissions = await _context.AccountPermissions
                .Where(ap => ap.account_id == accountId 
                    && !ap.is_granted 
                    && (ap.expires_at == null || ap.expires_at > now))
                .Join(_context.Permissions,
                    ap => ap.permission_id,
                    p => p.permission_id,
                    (ap, p) => p.permission_name)
                .ToListAsync();

            // Combine and limit
            return rolePermissions
                .Union(grantedPermissions)
                .Except(revokedPermissions)
                .Take(limit)
                .ToList();
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
                var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);
                return principal;
            }
            catch
            {
                return null;
            }
        }
    }
}
