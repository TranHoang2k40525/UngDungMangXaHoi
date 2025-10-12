using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Application.UseCases.Users
{
    public class UpdateProfile
    {
        private readonly IUserRepository _userRepository;

        public UpdateProfile(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<User> ExecuteAsync(int userId, UpdateProfileRequest request)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new Exception("Không tìm thấy người dùng.");
            }

            user.full_name = request.FullName ?? user.full_name;
            user.bio = request.Bio ?? user.bio;
            user.avatar_url = request.AvatarUrl != null ? new ImageUrl(request.AvatarUrl) : user.avatar_url;
            user.is_private = request.IsPrivate ?? user.is_private;

            await _userRepository.UpdateAsync(user);
            return user;
        }
    }

    public class UpdateProfileRequest
    {
        public string? FullName { get; set; }
        public string? Bio { get; set; }
        public string? AvatarUrl { get; set; }
        public bool? IsPrivate { get; set; }
    }
}