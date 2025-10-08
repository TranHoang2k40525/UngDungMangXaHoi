using System.Net.Mail;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Infrastructure.Services
{
    public interface IEmailService
    {
        Task SendOtpEmailAsync(string email, string otp);
    }

    public class EmailService : IEmailService
    {
        private readonly string _host;
        private readonly int _port;
        private readonly string _username;
        private readonly string _password;

        public EmailService(string host, int port, string username, string password)
        {
            _host = host;
            _port = port;
            _username = username;
            _password = password;
        }

        public async Task SendOtpEmailAsync(string email, string otp)
        {
            using var client = new SmtpClient(_host, _port)
            {
                Credentials = new System.Net.NetworkCredential(_username, _password),
                EnableSsl = true
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_username),
                Subject = "OTP for Registration",
                Body = $"Your OTP code is: {otp}. It will expire in 1 minute.",
                IsBodyHtml = false
            };
            mailMessage.To.Add(email);

            await client.SendMailAsync(mailMessage);
        }
    }
}