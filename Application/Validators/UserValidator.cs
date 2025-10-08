using System;
using System.Text.RegularExpressions;
using UngDungMangXaHoi.Domain.DTOs;

namespace UngDungMangXaHoi.Application.Validators
{
    public class UserValidator
    {
        private static readonly Regex EmailRegex = new Regex(
            @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private static readonly Regex UserNameRegex = new Regex(
            @"^[a-zA-Z0-9_]{3,20}$",
            RegexOptions.Compiled);

        public static ValidationResult ValidateUserCreate(UserCreateDto userCreateDto)
        {
            var result = new ValidationResult();

            // Validate UserName
            if (string.IsNullOrWhiteSpace(userCreateDto.UserName))
            {
                result.AddError("UserName", "Username is required");
            }
            else if (!UserNameRegex.IsMatch(userCreateDto.UserName))
            {
                result.AddError("UserName", "Username must be 3-20 characters long and contain only letters, numbers, and underscores");
            }

            // Validate Email
            if (string.IsNullOrWhiteSpace(userCreateDto.Email))
            {
                result.AddError("Email", "Email is required");
            }
            else if (!EmailRegex.IsMatch(userCreateDto.Email))
            {
                result.AddError("Email", "Invalid email format");
            }

            // Validate Password
            if (string.IsNullOrWhiteSpace(userCreateDto.Password))
            {
                result.AddError("Password", "Password is required");
            }
            else if (userCreateDto.Password.Length < 6)
            {
                result.AddError("Password", "Password must be at least 6 characters long");
            }

            // Validate FirstName
            if (string.IsNullOrWhiteSpace(userCreateDto.FirstName))
            {
                result.AddError("FirstName", "First name is required");
            }
            else if (userCreateDto.FirstName.Length > 50)
            {
                result.AddError("FirstName", "First name cannot exceed 50 characters");
            }

            // Validate LastName
            if (string.IsNullOrWhiteSpace(userCreateDto.LastName))
            {
                result.AddError("LastName", "Last name is required");
            }
            else if (userCreateDto.LastName.Length > 50)
            {
                result.AddError("LastName", "Last name cannot exceed 50 characters");
            }

            // Validate DateOfBirth
            if (userCreateDto.DateOfBirth >= DateTime.Now)
            {
                result.AddError("DateOfBirth", "Date of birth must be in the past");
            }
            else if (userCreateDto.DateOfBirth < DateTime.Now.AddYears(-120))
            {
                result.AddError("DateOfBirth", "Date of birth is invalid");
            }

            return result;
        }

        public static ValidationResult ValidateUserUpdate(UserUpdateDto userUpdateDto)
        {
            var result = new ValidationResult();

            // Validate FirstName
            if (string.IsNullOrWhiteSpace(userUpdateDto.FirstName))
            {
                result.AddError("FirstName", "First name is required");
            }
            else if (userUpdateDto.FirstName.Length > 50)
            {
                result.AddError("FirstName", "First name cannot exceed 50 characters");
            }

            // Validate LastName
            if (string.IsNullOrWhiteSpace(userUpdateDto.LastName))
            {
                result.AddError("LastName", "Last name is required");
            }
            else if (userUpdateDto.LastName.Length > 50)
            {
                result.AddError("LastName", "Last name cannot exceed 50 characters");
            }

            // Validate Bio
            if (!string.IsNullOrWhiteSpace(userUpdateDto.Bio) && userUpdateDto.Bio.Length > 500)
            {
                result.AddError("Bio", "Bio cannot exceed 500 characters");
            }

            return result;
        }

        public static ValidationResult ValidateUserLogin(UserLoginDto userLoginDto)
        {
            var result = new ValidationResult();

            // Validate Email
            if (string.IsNullOrWhiteSpace(userLoginDto.Email))
            {
                result.AddError("Email", "Email is required");
            }
            else if (!EmailRegex.IsMatch(userLoginDto.Email))
            {
                result.AddError("Email", "Invalid email format");
            }

            // Validate Password
            if (string.IsNullOrWhiteSpace(userLoginDto.Password))
            {
                result.AddError("Password", "Password is required");
            }

            return result;
        }
    }

    public class ValidationResult
    {
        public bool IsValid => Errors.Count == 0;
        public Dictionary<string, List<string>> Errors { get; } = new Dictionary<string, List<string>>();

        public void AddError(string field, string message)
        {
            if (!Errors.ContainsKey(field))
            {
                Errors[field] = new List<string>();
            }
            Errors[field].Add(message);
        }

        public string GetErrorMessage()
        {
            var messages = new List<string>();
            foreach (var error in Errors)
            {
                messages.Add($"{error.Key}: {string.Join(", ", error.Value)}");
            }
            return string.Join("; ", messages);
        }
    }
}

