using System;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Infrastructure.Services
{
    public class BCryptPasswordHasher : IPasswordHasher
    {
        public string HashPassword(string password)
        {
            // TODO: Implement BCrypt hashing
            // For now, using a simple hash (NOT SECURE - for development only)
            return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(password + "salt"));
        }

        public bool VerifyPassword(string password, string hashedPassword)
        {
            // TODO: Implement BCrypt verification
            // For now, using simple comparison (NOT SECURE - for development only)
            var hashedInput = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(password + "salt"));
            return hashedInput == hashedPassword;
        }
    }
}

