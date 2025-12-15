using System;

namespace UngDungMangXaHoi.Domain.ValueObjects
{
    public class PasswordHash
    {
        public string Value { get; private set; }

        public PasswordHash(string value)
        {
            // Allow empty string for pending accounts (chưa hoàn tất đăng ký)
            // Chỉ reject NULL
            if (value == null)
                throw new ArgumentException("Password hash cannot be null", nameof(value));

            Value = value;
        }

        public static implicit operator string(PasswordHash passwordHash) => passwordHash.Value;
        public static implicit operator PasswordHash(string value) => new PasswordHash(value);

        public override string ToString() => Value;

        public override bool Equals(object? obj)
        {
            if (obj is PasswordHash other)
                return Value == other.Value;
            return false;
        }

        public override int GetHashCode() => Value.GetHashCode();

        public static bool operator ==(PasswordHash left, PasswordHash right)
        {
            if (ReferenceEquals(left, right)) return true;
            if (left is null || right is null) return false;
            return left.Value == right.Value;
        }

        public static bool operator !=(PasswordHash left, PasswordHash right) => !(left == right);
    }
}

