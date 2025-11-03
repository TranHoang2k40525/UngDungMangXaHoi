namespace UngDungMangXaHoi.Domain.Entities
{
    public class LoginHistory
    {
        public int history_id { get; set; }
        public int account_id { get; set; }
        public string ip_address { get; set; } = null!;
        public string device_info { get; set; } = null!;
        public DateTimeOffset login_time { get; set; }
        public Account Account { get; set; } = null!;
    }
}