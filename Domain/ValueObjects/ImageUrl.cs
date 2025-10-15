using System;
using System.Text.RegularExpressions;

namespace UngDungMangXaHoi.Domain.ValueObjects
{
    public class ImageUrl
    {
        public string Value { get; private set; }

        private static readonly Regex UrlRegex = new Regex(
            @"^(https?://[^\s/$.?#].[^\s]*|/[^\s]*)$",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public ImageUrl(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Image URL cannot be null or empty", nameof(value));

            // Chấp nhận cả URL đầy đủ (https://...) và relative path (/Assets/...)
            if (!UrlRegex.IsMatch(value))
                throw new ArgumentException("Invalid URL format. Must be full URL (https://...) or relative path (/...)", nameof(value));

            Value = value;
        }

        public static implicit operator string(ImageUrl imageUrl) => imageUrl.Value;
        public static implicit operator ImageUrl(string value) => new ImageUrl(value);

        public override string ToString() => Value;

        public override bool Equals(object? obj)
        {
            if (obj is ImageUrl other)
                return Value == other.Value;
            return false;
        }

        public override int GetHashCode() => Value.GetHashCode();

        public static bool operator ==(ImageUrl? left, ImageUrl? right)
        {
            if (ReferenceEquals(left, right)) return true;
            if (left is null || right is null) return false;
            return left.Value == right.Value;
        }

        public static bool operator !=(ImageUrl? left, ImageUrl? right) => !(left == right);
    }
}

