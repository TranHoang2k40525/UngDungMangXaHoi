using System.Text.RegularExpressions;

namespace UngDungMangXaHoi.Domain.ValueObjects
{
    public class PhoneNumber
    {
        public string Value { get; private set; }

        public PhoneNumber(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Phone number cannot be empty.");
        
        // Allow PENDING_* placeholder for pending admin accounts
        if (value.StartsWith("PENDING_", StringComparison.OrdinalIgnoreCase))
        {
            Value = value;
            return;
        }
        
        if (!Regex.IsMatch(value, @"^\+?\d{10,15}$"))
            throw new ArgumentException("Invalid phone number format. Phone number must be 10-15 digits, optionally starting with '+'.");
        Value = value;
    }
    }
}