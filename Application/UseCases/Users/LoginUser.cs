using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Domain.DTOs;

namespace UngDungMangXaHoi.Application.UseCases.Users
{
    public class LoginUser
    {
        private readonly IUserRepository _userRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly ITokenService _tokenService;

        public LoginUser(IUserRepository userRepository, IPasswordHasher passwordHasher, ITokenService tokenService)
        {
            _userRepository = userRepository;
            _passwordHasher = passwordHasher;
            _tokenService = tokenService;
        }

        public async Task<LoginResultDto> ExecuteAsync(UserLoginDto userLoginDto)
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(userLoginDto.Email))
                throw new ArgumentException("Email is required");

            if (string.IsNullOrWhiteSpace(userLoginDto.Password))
                throw new ArgumentException("Password is required");

            // Get user by email
            var email = new Email(userLoginDto.Email);
            var user = await _userRepository.GetByEmailAsync(email);

            if (user == null)
                throw new UnauthorizedAccessException("Invalid email or password");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is deactivated");

            // Verify password
            if (!_passwordHasher.VerifyPassword(userLoginDto.Password, user.PasswordHash.Value))
                throw new UnauthorizedAccessException("Invalid email or password");

            // Generate token
            var token = _tokenService.GenerateToken(user);

            // Return result
            return new LoginResultDto
            {
                Token = token,
                User = new UserDto
                {
                    Id = user.Id,
                    UserName = user.UserName.Value,
                    Email = user.Email.Value,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    DateOfBirth = user.DateOfBirth,
                    ProfileImageUrl = user.ProfileImageUrl?.Value,
                    CoverImageUrl = user.CoverImageUrl?.Value,
                    Bio = user.Bio,
                    CreatedAt = user.CreatedAt,
                    IsActive = user.IsActive,
                    FriendsCount = 0, // TODO: Calculate from friendship repository
                    PostsCount = 0    // TODO: Calculate from post repository
                }
            };
        }
    }

    public class LoginResultDto
    {
        public string Token { get; set; }
        public UserDto User { get; set; }
    }
}

