using System;
using System.Text.RegularExpressions;

namespace UngDungMangXaHoi.Domain.ValueObjects
{
    public class UserName
    {
        public string Value { get; private set; }

        private static readonly Regex UserNameRegex = new Regex(
            @"^[a-zA-Z0-9_]{3,20}$",
            RegexOptions.Compiled);

        public UserName(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Username cannot be null or empty", nameof(value));

            if (!UserNameRegex.IsMatch(value))
                throw new ArgumentException("Username must be 3-20 characters long and contain only letters, numbers, and underscores", nameof(value));

            Value = value.ToLowerInvariant();
        }

        public static implicit operator string(UserName userName) => userName.Value;
        public static implicit operator UserName(string value) => new UserName(value);

        public override string ToString() => Value;

        public override bool Equals(object? obj)
        {
            if (obj is UserName other)
                return Value == other.Value;
            return false;
        }

        public override int GetHashCode() => Value.GetHashCode();

        public static bool operator ==(UserName left, UserName right)
        {
            if (ReferenceEquals(left, right)) return true;
            if (left is null || right is null) return false;
            return left.Value == right.Value;
        }

        public static bool operator !=(UserName left, UserName right) => !(left == right);
    }
}

