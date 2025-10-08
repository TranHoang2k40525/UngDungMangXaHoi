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
            if (!Regex.IsMatch(value, @"^\+?[1-9]\d{1,14}$"))
                throw new ArgumentException("Invalid phone number format.");
            Value = value;
        }
    }
}