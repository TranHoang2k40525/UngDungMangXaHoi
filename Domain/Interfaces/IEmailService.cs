using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IEmailService
    {
        Task SendOtpEmailAsync(string email, string otp, string purpose, string fullName);
    }
}
