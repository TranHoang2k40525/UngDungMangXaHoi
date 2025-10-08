using System;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Domain.Entities
{
    public enum AccountType
    {
        User,
        Admin
    }

    public class Account
    {
        public int account_id { get; set; }
        public Email? email { get; set; }
        public PhoneNumber? phone { get; set; }
        public PasswordHash password_hash { get; set; }
        public AccountType account_type { get; set; }
        public string status { get; set; }
        public DateTime created_at { get; set; }
        public DateTime updated_at { get; set; }

        public User? User { get; set; }
        public Admin? Admin { get; set; }
    }
}