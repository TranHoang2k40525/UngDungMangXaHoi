using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using UngDungMangXaHoi.Domain.Interfaces; // { changed code }

namespace UngDungMangXaHoi.Infrastructure.Services
{
    public interface IEmailService
    {
        Task SendOtpEmailAsync(string email, string otp);
    }

    public class EmailService : INotificationService // { changed code }
    {
        private readonly string _smtpHost;
        private readonly int _smtpPort;
        private readonly string _smtpUser;
        private readonly string _smtpPass;
        private readonly string _fromAddress;

        // { changed code } accept IConfiguration and read settings
        public EmailService(IConfiguration configuration)
        {
            _smtpHost = configuration["Email:SmtpHost"] ?? throw new ArgumentNullException("Email:SmtpHost");
            _smtpPort = int.TryParse(configuration["Email:SmtpPort"], out var p) ? p : throw new ArgumentNullException("Email:SmtpPort");
            _smtpUser = configuration["Email:SmtpUser"] ?? throw new ArgumentNullException("Email:SmtpUser");
            _smtpPass = configuration["Email:SmtpPass"] ?? throw new ArgumentNullException("Email:SmtpPass");
            _fromAddress = configuration["Email:From"] ?? throw new ArgumentNullException("Email:From");
        }

        public async Task SendOtpEmailAsync(string email, string otp)
        {
            using var client = new SmtpClient(_smtpHost, _smtpPort)
            {
                Credentials = new System.Net.NetworkCredential(_smtpUser, _smtpPass),
                EnableSsl = true
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_fromAddress),
                Subject = "OTP for Registration",
                Body = $"Your OTP code is: {otp}. It will expire in 1 minute.",
                IsBodyHtml = false
            };
            mailMessage.To.Add(email);

            await client.SendMailAsync(mailMessage);
        }

        // Implement interface method
        public async Task SendNotificationAsync(string recipient, string message)
        {
            if (string.IsNullOrWhiteSpace(recipient)) throw new ArgumentNullException(nameof(recipient));
            if (string.IsNullOrWhiteSpace(message)) throw new ArgumentNullException(nameof(message));

            // Simple SMTP send; adjust as needed for your environment
            var mail = new MailMessage
            {
                From = new MailAddress(_fromAddress),
                Subject = "Notification",
                Body = message,
                IsBodyHtml = false
            };
            mail.To.Add(recipient);

            using var client = new SmtpClient(_smtpHost, _smtpPort)
            {
                Credentials = new NetworkCredential(_smtpUser, _smtpPass),
                EnableSsl = true
            };

            await Task.Run(() => client.Send(mail));
        }
    }
}