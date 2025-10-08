using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class OTP
    {
        public int otp_id { get; set; }
        public int account_id { get; set; }
        public string otp_hash { get; set; }
        public string purpose { get; set; }
        public DateTime expires_at { get; set; }
        public bool used { get; set; }
        public DateTime created_at { get; set; }

        public Account Account { get; set; }
    }
}