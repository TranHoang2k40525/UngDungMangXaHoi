using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

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

        public static string GenerateToken(object payloadObject, string secret, int expireSeconds)
        {
            var header = new { alg = "HS256", typ = "JWT" };
            var payloadJson = JsonSerializer.Serialize(payloadObject);
            var headerJson = JsonSerializer.Serialize(header);

            var encodedHeader = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));
            var encodedPayload = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));
            var unsignedToken = $"{encodedHeader}.{encodedPayload}";

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


