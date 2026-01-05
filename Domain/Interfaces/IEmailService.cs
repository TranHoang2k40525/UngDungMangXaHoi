using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IEmailService
    {
        Task SendOtpEmailAsync(string email, string otp, string purpose, string fullName);
        Task SendAccountDeletionEmailAsync(string email, string fullName, string reason, int violationCount);
        Task SendAccountLockedEmailAsync(string email, string fullName, string reason);
        Task SendAccountUnlockedEmailAsync(string email, string fullName);
    }
}
