using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class OTP
    {
        public int otp_id { get; set; }
        public int account_id { get; set; }
        public string otp_hash { get; set; } = null!;
        public string purpose { get; set; } = null!;
        public DateTimeOffset expires_at { get; set; }
        public bool used { get; set; }
        public DateTimeOffset created_at { get; set; }

        public Account Account { get; set; } = null!;
    }
}