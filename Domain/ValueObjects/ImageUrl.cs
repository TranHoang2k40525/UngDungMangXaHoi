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

        private static readonly Regex Base64Regex = new Regex(
            @"^data:image/(png|jpg|jpeg|gif|webp);base64,",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public ImageUrl(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Image URL cannot be null or empty", nameof(value));

            // Chấp nhận:
            // 1. URL đầy đủ (https://...)
            // 2. Relative path (/Assets/...)
            // 3. Base64 data URL (data:image/...;base64,...)
            bool isValidUrl = UrlRegex.IsMatch(value);
            bool isBase64 = Base64Regex.IsMatch(value);

            if (!isValidUrl && !isBase64)
                throw new ArgumentException("Invalid format. Must be URL, relative path, or Base64 data URL", nameof(value));

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

