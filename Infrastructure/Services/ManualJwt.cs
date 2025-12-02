using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Services
{
    public static class ManualJwt
    {
        private static string Base64UrlEncode(byte[] input)
        {
            return Convert.ToBase64String(input)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
        }

        public static string GenerateAccessToken(Account account, string secret, string issuer, string audience)
        {
            var header = new { alg = "HS256", typ = "JWT" };
            
            // Tạo payload với user_id nếu là User account
            object payload;
            if (account.account_type == AccountType.User && account.User != null)
            {
                payload = new
                {
                    sub = account.account_id,
                    user_id = account.User.user_id,
                    account_type = account.account_type.ToString(),
                    iss = issuer,
                    aud = audience,
                    exp = DateTimeOffset.UtcNow.AddMinutes(15).ToUnixTimeSeconds(),
                    iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                };
            }
            else
            {
                payload = new
                {
                    sub = account.account_id,
                    account_type = account.account_type.ToString(),
                    iss = issuer,
                    aud = audience,
                    exp = DateTimeOffset.UtcNow.AddMinutes(15).ToUnixTimeSeconds(),
                    iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                };
            }

            var headerJson = JsonSerializer.Serialize(header);
            var payloadJson = JsonSerializer.Serialize(payload);
            var encodedHeader = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));
            var encodedPayload = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));
            var unsignedToken = $"{encodedHeader}.{encodedPayload}";

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var signature = Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(unsignedToken)));
            return $"{unsignedToken}.{signature}";
        }

        public static string GenerateRefreshToken(Account account, string secret)
        {
            var payload = new
            {
                sub = account.account_id,
                exp = DateTimeOffset.UtcNow.AddDays(30).ToUnixTimeSeconds(),
                iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };

            var payloadJson = JsonSerializer.Serialize(payload);
            var encodedPayload = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));
            var unsignedToken = $".{encodedPayload}";

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var signature = Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(unsignedToken)));
            return $"{unsignedToken}.{signature}";
        }

        public static bool VerifyToken(string token, string secret)
        {
            if (string.IsNullOrWhiteSpace(token)) return false;
            var parts = token.Split('.');
            if (parts.Length != 3) return false;
            var unsigned = $"{parts[0]}.{parts[1]}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var expected = Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(unsigned)));
            return expected == parts[2];
        }
    }
}