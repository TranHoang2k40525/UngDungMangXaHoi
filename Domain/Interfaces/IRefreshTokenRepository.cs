using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IRefreshTokenRepository
    {
        Task<RefreshToken> AddAsync(RefreshToken refreshToken);
        Task<RefreshToken?> GetByTokenAsync(string token);
        Task<RefreshToken?> GetByAccountIdAsync(int accountId);
        Task UpdateAsync(RefreshToken refreshToken);
        Task DeleteAsync(int tokenId);
        Task DeleteByAccountIdAsync(int accountId);
        Task CleanupExpiredTokensAsync();
    }
}
