using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Domain.DTOs;

namespace UngDungMangXaHoi.Application.UseCases.Users
{
    public class RegisterUser
    {
        private readonly IUserRepository _userRepository;
        private readonly IPasswordHasher _passwordHasher;

        public RegisterUser(IUserRepository userRepository, IPasswordHasher passwordHasher)
        {
            _userRepository = userRepository;
            _passwordHasher = passwordHasher;
        }

        public async Task<UserDto> ExecuteAsync(UserCreateDto userCreateDto)
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(userCreateDto.UserName))
                throw new ArgumentException("Username is required");

            if (string.IsNullOrWhiteSpace(userCreateDto.Email))
                throw new ArgumentException("Email is required");

            if (string.IsNullOrWhiteSpace(userCreateDto.Password))
                throw new ArgumentException("Password is required");

            if (userCreateDto.Password.Length < 6)
                throw new ArgumentException("Password must be at least 6 characters long");

            // Check if user already exists
            var email = new Email(userCreateDto.Email);
            var userName = new UserName(userCreateDto.UserName);

            if (await _userRepository.ExistsByEmailAsync(email))
                throw new InvalidOperationException("User with this email already exists");

            if (await _userRepository.ExistsByUserNameAsync(userName))
                throw new InvalidOperationException("Username is already taken");

            // Hash password
            var passwordHash = new PasswordHash(_passwordHasher.HashPassword(userCreateDto.Password));

            // Create user
            var user = new User(
                userName,
                email,
                passwordHash,
                userCreateDto.FirstName,
                userCreateDto.LastName,
                userCreateDto.DateOfBirth
            );

            // Save user
            var savedUser = await _userRepository.AddAsync(user);

            // Return DTO
            return new UserDto
            {
                Id = savedUser.Id,
                UserName = savedUser.UserName.Value,
                Email = savedUser.Email.Value,
                FirstName = savedUser.FirstName,
                LastName = savedUser.LastName,
                DateOfBirth = savedUser.DateOfBirth,
                ProfileImageUrl = savedUser.ProfileImageUrl?.Value,
                CoverImageUrl = savedUser.CoverImageUrl?.Value,
                Bio = savedUser.Bio,
                CreatedAt = savedUser.CreatedAt,
                IsActive = savedUser.IsActive,
                FriendsCount = 0,
                PostsCount = 0
            };
        }
    }
}

