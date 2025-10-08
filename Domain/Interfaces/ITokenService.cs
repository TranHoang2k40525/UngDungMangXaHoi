using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface ITokenService
    {
        string GenerateToken(User user);
        bool ValidateToken(string token);
        Guid? GetUserIdFromToken(string token);
    }
}

