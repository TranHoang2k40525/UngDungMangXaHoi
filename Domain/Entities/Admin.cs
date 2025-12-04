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
        public ICollection<AdminAction> AdminActions { get; set; } = new List<AdminAction>();
        public ICollection<AccountSanction> AccountSanctions { get; set; } = new List<AccountSanction>();
        public ICollection<BusinessVerificationRequest> BusinessVerificationRequestsReviewed { get; set; } = new List<BusinessVerificationRequest>();
        public ICollection<ContentReport> ContentReports = new List<ContentReport>();
        public ICollection<ModerationLog> ModerationLogs { get; set; } = new List<ModerationLog>();

    }
}