using System;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class Admin
    {
        public int admin_id { get; set; }
        public int account_id { get; set; }
        public string full_name { get; set; } = null!;
        public Gender gender { get; set; }
        public string? bio { get; set; }
        public ImageUrl? avatar_url { get; set; }
        public bool is_private { get; set; }
        public DateTimeOffset date_of_birth { get; set; }
        public string? address { get; set; }
        public string? hometown { get; set; }
        public string? job { get; set; }
        public string? website { get; set; }
        public string admin_level { get; set; } = null!;

        public Account Account { get; set; } = null!;
    }
}