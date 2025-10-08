using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Domain.DTOs;

namespace UngDungMangXaHoi.Application.UseCases.Users
{
    public class UpdateProfile
    {
        private readonly IUserRepository _userRepository;

        public UpdateProfile(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<UserDto> ExecuteAsync(Guid userId, UserUpdateDto userUpdateDto)
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(userUpdateDto.FirstName))
                throw new ArgumentException("First name is required");

            if (string.IsNullOrWhiteSpace(userUpdateDto.LastName))
                throw new ArgumentException("Last name is required");

            // Get user
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new ArgumentException("User not found");

            if (!user.IsActive)
                throw new InvalidOperationException("Cannot update deactivated account");

            // Update profile
            ImageUrl? profileImageUrl = null;
            ImageUrl? coverImageUrl = null;

            if (!string.IsNullOrWhiteSpace(userUpdateDto.ProfileImageUrl))
                profileImageUrl = new ImageUrl(userUpdateDto.ProfileImageUrl);

            if (!string.IsNullOrWhiteSpace(userUpdateDto.CoverImageUrl))
                coverImageUrl = new ImageUrl(userUpdateDto.CoverImageUrl);

            user.UpdateProfile(
                userUpdateDto.FirstName,
                userUpdateDto.LastName,
                userUpdateDto.Bio,
                profileImageUrl,
                coverImageUrl
            );

            // Save changes
            await _userRepository.UpdateAsync(user);

            // Return updated user DTO
            return new UserDto
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
            };
        }
    }
}

