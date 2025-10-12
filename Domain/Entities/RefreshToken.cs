namespace UngDungMangXaHoi.Domain.Entities
{
    public class RefreshToken
    {
        public int token_id { get; set; }
        public int account_id { get; set; }
        public string refresh_token { get; set; } = null!;
        public DateTimeOffset expires_at { get; set; }
        public DateTimeOffset created_at { get; set; }
        public Account Account { get; set; } = null!;
    }
}