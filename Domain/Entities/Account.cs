using System;
using System.Collections.Generic;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class Account
    {
        public int account_id { get; set; }
        public Email? email { get; set; }
        public PhoneNumber? phone { get; set; }
        public PasswordHash password_hash { get; set; } = null!;
        public string status { get; set; } = null!;
        public DateTimeOffset created_at { get; set; }
        public DateTimeOffset updated_at { get; set; }
        public DateTime? business_verified_at { get; set; } // For Business accounts
        public DateTime? business_expires_at { get; set; } // For Business accounts
        
        // Navigation properties
        public User? User { get; set; }
        public Admin? Admin { get; set; }
        
        // RBAC Navigation Properties
        public ICollection<AccountRole> AccountRoles { get; set; } = new List<AccountRole>();
        public ICollection<AccountPermission> AccountPermissions { get; set; } = new List<AccountPermission>();
        
        // Other relationships
        public ICollection<ContentModeration> ContentModerations { get; set; } = new List<ContentModeration>();
        public ICollection<AccountSanction> AccountSanctions { get; set; } = new List<AccountSanction>();
        public ICollection<BusinessVerificationRequest> BusinessVerificationRequests { get; set; } = new List<BusinessVerificationRequest>();
        public ICollection<ContentReport> ContentReports { get; set; } = new List<ContentReport>();
    }
}