using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Infrastructure.Services
{
    public class EmailService : IEmailService, INotificationService
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

        public async Task SendOtpEmailAsync(string email, string otp, string purpose, string fullName)
        {
            using var client = new SmtpClient(_smtpHost, _smtpPort)
            {
                Credentials = new System.Net.NetworkCredential(_smtpUser, _smtpPass),
                EnableSsl = true
            };

            var subject = purpose switch
            {
                "register" => "Mã OTP đăng ký tài khoản",
                "forgot_password" => "Mã OTP quên mật khẩu",
                "change_password" => "Mã OTP đổi mật khẩu",
                "change_email" => "Mã OTP đổi email",
                "change_phone" => "Mã OTP đổi số điện thoại",
                _ => "Mã OTP xác thực"
            };

            var body = GenerateOtpEmailBody(purpose, fullName, otp);

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_fromAddress),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            mailMessage.To.Add(email);

            await client.SendMailAsync(mailMessage);
        }

        private string GenerateOtpEmailBody(string purpose, string fullName, string otp)
        {
            var actionText = purpose switch
            {
                "register" => "đăng ký",
                "forgot_password" => "quên mật khẩu",
                "change_password" => "đổi mật khẩu",
                "change_email" => "đổi email",
                "change_phone" => "đổi số điện thoại",
                _ => "xác thực"
            };

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
        .otp-code {{ font-size: 24px; font-weight: bold; color: #4CAF50; text-align: center; margin: 20px 0; padding: 15px; background-color: white; border-radius: 5px; border: 2px solid #4CAF50; }}
        .warning {{ background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Xác thực OTP</h1>
        </div>
        <div class='content'>
            <p>Xin chào <strong>{fullName}</strong>,</p>
            
            <p>Mã {actionText} của bạn là:</p>
            
            <div class='otp-code'>{otp}</div>
            
            <div class='warning'>
                <strong>⚠️ Lưu ý quan trọng:</strong><br>
                Vui lòng không cung cấp mã OTP cho người khác, mã OTP tồn tại trong 1 phút, hết 1 phút tự động hết hiệu lực.
            </div>
            
            <p>Nếu bạn không yêu cầu {actionText}, vui lòng bỏ qua email này.</p>
            
            <p>Trân trọng,<br>Đội ngũ hỗ trợ</p>
        </div>
    </div>
</body>
</html>";
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

        public async Task SendMentionNotificationAsync(int mentionedUserId, string mentionerUsername, int postId, int commentId)
        {
            // Email notification for mentions (optional)
            System.Console.WriteLine($"[Email] Would send mention email to user {mentionedUserId}");
            await Task.CompletedTask;
        }
    }
}