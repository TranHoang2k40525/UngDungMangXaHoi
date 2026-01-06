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

        public async Task SendAccountDeletionEmailAsync(string email, string fullName, string reason, int violationCount)
        {
            using var client = new SmtpClient(_smtpHost, _smtpPort)
            {
                Credentials = new System.Net.NetworkCredential(_smtpUser, _smtpPass),
                EnableSsl = true
            };

            var subject = "THÔNG BÁO XÓA TÀI KHOẢN";
            var body = GenerateAccountDeletionEmailBody(fullName, reason, violationCount);

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

        private string GenerateAccountDeletionEmailBody(string fullName, string reason, int violationCount)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
        .warning-box {{ background-color: #fef2f2; border: 2px solid #dc2626; color: #991b1b; padding: 20px; border-radius: 5px; margin: 20px 0; }}
        .info-box {{ background-color: #fff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }}
        h3 {{ color: #dc2626; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>⚠️ CẢNH BÁO QUAN TRỌNG</h1>
        </div>
        <div class='content'>
            <p>Kính gửi <strong>{fullName}</strong>,</p>
            
            <div class='warning-box'>
                <h3>TÀI KHOẢN CỦA BẠN ĐÃ BỊ XÓA VĨNH VIỄN</h3>
                <p>Tài khoản của bạn đã bị xóa khỏi hệ thống do vi phạm chính sách cộng đồng.</p>
            </div>
            
            <div class='info-box'>
                <p><strong>📊 Số lần vi phạm:</strong> {violationCount} lần</p>
                <p><strong>📝 Lý do xóa tài khoản:</strong></p>
                <p style='background-color: #f3f4f6; padding: 10px; border-radius: 4px; font-style: italic;'>{reason}</p>
            </div>
            
            <h3>❌ Hậu quả:</h3>
            <ul>
                <li>📧 Tất cả email liên kết với tài khoản sẽ bị hủy</li>
                <li>📝 Tất cả bài đăng, bình luận sẽ bị xóa</li>
                <li>🗑️ Hành động này KHÔNG THỂ HOÀN TÁC</li>
            </ul>
            
            <div class='warning-box'>
                <p><strong>⚠️ Lưu ý:</strong></p>
                <p>Nếu bạn cho rằng đây là một nhầm lẫn, vui lòng liên hệ bộ phận hỗ trợ trong vòng 7 ngày kể từ ngày nhận email này.</p>
            </div>
            
            <div class='footer'>
                <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                <p>© 2025 Ứng Dụng Mạng Xã Hội. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>";
        }        public async Task SendAccountLockedEmailAsync(string email, string fullName, string reason)
        {
            using var client = new SmtpClient(_smtpHost, _smtpPort)
            {
                Credentials = new NetworkCredential(_smtpUser, _smtpPass),
                EnableSsl = true
            };

            var subject = "⚠️ Tài khoản của bạn đã bị khóa tạm thời";
            var body = GenerateAccountLockedEmailBody(fullName, reason);

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

        public async Task SendAccountUnlockedEmailAsync(string email, string fullName)
        {
            using var client = new SmtpClient(_smtpHost, _smtpPort)
            {
                Credentials = new NetworkCredential(_smtpUser, _smtpPass),
                EnableSsl = true
            };

            var subject = "✅ Tài khoản của bạn đã được mở khóa";
            var body = GenerateAccountUnlockedEmailBody(fullName);

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

        private string GenerateAccountLockedEmailBody(string fullName, string reason)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
        .warning-box {{ background-color: #fef3c7; border: 2px solid #f59e0b; color: #92400e; padding: 20px; border-radius: 5px; margin: 20px 0; }}
        .info-box {{ background-color: #fff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }}
        h3 {{ color: #f59e0b; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>⚠️ THÔNG BÁO KHÓA TÀI KHOẢN</h1>
        </div>
        <div class='content'>
            <p>Kính gửi <strong>{fullName}</strong>,</p>
            
            <div class='warning-box'>
                <h3>TÀI KHOẢN CỦA BẠN ĐÃ BỊ KHÓA TẠM THỜI</h3>
                <p>Tài khoản của bạn đã bị khóa do vi phạm chính sách cộng đồng.</p>
            </div>
            
            <div class='info-box'>
                <p><strong>📝 Lý do khóa tài khoản:</strong></p>
                <p style='background-color: #f3f4f6; padding: 10px; border-radius: 4px; font-style: italic;'>{reason}</p>
            </div>
            
            <h3>❌ Hạn chế khi tài khoản bị khóa:</h3>
            <ul>
                <li>🚫 Không thể đăng nhập vào hệ thống</li>
                <li>📝 Không thể tạo bài đăng hoặc bình luận mới</li>
                <li>💬 Không thể tương tác với người dùng khác</li>
                <li>🔔 Không nhận được thông báo</li>
            </ul>
            
            <div class='warning-box'>
                <p><strong>📞 Liên hệ hỗ trợ:</strong></p>
                <p>Nếu bạn cho rằng đây là một nhầm lẫn hoặc muốn khiếu nại, vui lòng liên hệ bộ phận hỗ trợ qua email hoangzai2k403@gmail.com</p>
            </div>
            
            <div class='footer'>
                <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                <p>© 2025 Ứng Dụng Mạng Xã Hội. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>";
        }

        private string GenerateAccountUnlockedEmailBody(string fullName)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
        .success-box {{ background-color: #d1fae5; border: 2px solid #10b981; color: #065f46; padding: 20px; border-radius: 5px; margin: 20px 0; }}
        .info-box {{ background-color: #fff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }}
        h3 {{ color: #10b981; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>✅ THÔNG BÁO MỞ KHÓA TÀI KHOẢN</h1>
        </div>
        <div class='content'>
            <p>Kính gửi <strong>{fullName}</strong>,</p>
            
            <div class='success-box'>
                <h3>TÀI KHOẢN CỦA BẠN ĐÃ ĐƯỢC MỞ KHÓA</h3>
                <p>Chúng tôi vui mừng thông báo rằng tài khoản của bạn đã được mở khóa và bạn có thể sử dụng lại toàn bộ các tính năng.</p>
            </div>
            
            <h3>✨ Bạn có thể làm gì bây giờ:</h3>
            <ul>
                <li>🔓 Đăng nhập lại vào hệ thống</li>
                <li>📝 Tạo bài đăng và bình luận</li>
                <li>💬 Tương tác với bạn bè và cộng đồng</li>
                <li>🔔 Nhận thông báo như bình thường</li>
            </ul>
            
            <div class='info-box'>
                <p><strong>⚠️ Lưu ý quan trọng:</strong></p>
                <p>Để tránh bị khóa lại trong tương lai, vui lòng tuân thủ các quy định cộng đồng:</p>
                <ul>
                    <li>Không đăng nội dung bạo lực, thù hận</li>
                    <li>Không spam hoặc quấy rối người khác</li>
                    <li>Tôn trọng quyền riêng tư của mọi người</li>
                    <li>Không chia sẻ thông tin sai lệch</li>
                </ul>
            </div>
            
            <div class='footer'>
                <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
                <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                <p>© 2025 Ứng Dụng Mạng Xã Hội. All rights reserved.</p>
            </div>
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
    }
}