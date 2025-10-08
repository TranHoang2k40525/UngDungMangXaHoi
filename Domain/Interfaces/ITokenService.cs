using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface ITokenService
    {
        Task<(string AccessToken, string RefreshToken)> GenerateTokensAsync(Account account);
        Task<string> GenerateOtpAsync();
    }
}