using System;
using System.Text.RegularExpressions;

namespace UngDungMangXaHoi.Domain.ValueObjects
{
    public class Email
    {
        public string Value { get; private set; }

        private static readonly Regex EmailRegex = new Regex(
            @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public Email(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Email cannot be null or empty", nameof(value));

            if (!EmailRegex.IsMatch(value))
                throw new ArgumentException("Invalid email format", nameof(value));

            Value = value.ToLowerInvariant();
        }

        public static implicit operator string(Email email) => email.Value;
        public static implicit operator Email(string value) => new Email(value);

        public override string ToString() => Value;

        public override bool Equals(object obj)
        {
            if (obj is Email other)
                return Value == other.Value;
            return false;
        }

        public override int GetHashCode() => Value.GetHashCode();

        public static bool operator ==(Email left, Email right)
        {
            if (ReferenceEquals(left, right)) return true;
            if (left is null || right is null) return false;
            return left.Value == right.Value;
        }

        public static bool operator !=(Email left, Email right) => !(left == right);
    }
}

