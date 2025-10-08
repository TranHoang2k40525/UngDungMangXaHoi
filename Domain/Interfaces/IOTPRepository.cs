using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IOTPRepository
    {
        Task<OTP> AddAsync(OTP otp);
        Task<OTP?> GetByAccountIdAsync(int accountId, string purpose);
        Task UpdateAsync(OTP otp);
        Task DeleteAsync(int otpId);
        Task<int> GetFailedAttemptsAsync(int accountId, string purpose);
    }
}