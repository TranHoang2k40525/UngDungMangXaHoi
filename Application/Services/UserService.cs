using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    public class UserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IPostRepository _postRepository;
        private readonly IBlockRepository _blockRepository;

        public UserService(IUserRepository userRepository, IPostRepository postRepository, IBlockRepository blockRepository)
        {
            _userRepository = userRepository;
            _postRepository = postRepository;
            _blockRepository = blockRepository;
        }

        public async Task<PublicProfileDto?> GetPublicProfileByIdAsync(int currentAccountId, int targetUserId)
        {
            var currentUser = await _userRepository.GetByAccountIdAsync(currentAccountId);
            if (currentUser == null) return null;

            var targetUser = await _userRepository.GetByIdAsync(targetUserId);
            if (targetUser == null) return null;

            var blockedByTarget = await _blockRepository.IsBlockedAsync(targetUser.user_id, currentUser.user_id);
            if (blockedByTarget) return null;

            var postsCount = await _postRepository.CountPostsByUserIdAsync(targetUser.user_id);
            var followersCount = await _userRepository.GetFollowersCountAsync(targetUser.user_id);
            var followingCount = await _userRepository.GetFollowingCountAsync(targetUser.user_id);
            var isFollowing = await _userRepository.IsFollowingAsync(currentUser.user_id, targetUser.user_id);
            var isFollowingMe = await _userRepository.IsFollowingAsync(targetUser.user_id, currentUser.user_id);

            // RBAC: Determine account type from roles
            var isBusiness = targetUser.Account.AccountRoles.Any(ar => 
                ar.is_active && ar.Role.role_name == "Business");
            var isAdmin = targetUser.Account.AccountRoles.Any(ar => 
                ar.is_active && ar.Role.role_name == "Admin");
            var accountType = isAdmin ? "Admin" : (isBusiness ? "Business" : "User");

            return new PublicProfileDto
            {
                UserId = targetUser.user_id,
                Username = targetUser.username.Value,
                FullName = targetUser.full_name,
                AvatarUrl = targetUser.avatar_url?.Value,
                Bio = targetUser.bio,
                Website = targetUser.website,
                Address = targetUser.address,
                Hometown = targetUser.hometown,
                Gender = targetUser.gender.ToString(),
                PostsCount = postsCount,
                FollowersCount = followersCount,
                FollowingCount = followingCount,
                IsFollowing = isFollowing,
                IsFollowingMe = isFollowingMe,
                AccountType = accountType
            };
        }

        public async Task<PublicProfileDto?> GetPublicProfileByUsernameAsync(int currentAccountId, string username)
        {
            var currentUser = await _userRepository.GetByAccountIdAsync(currentAccountId);
            if (currentUser == null) return null;

            var targetUser = await _userRepository.GetByUsernameAsync(username);
            if (targetUser == null) return null;

            var blockedByTarget = await _blockRepository.IsBlockedAsync(targetUser.user_id, currentUser.user_id);
            if (blockedByTarget) return null;

            var postsCount = await _postRepository.CountPostsByUserIdAsync(targetUser.user_id);
            var followersCount = await _userRepository.GetFollowersCountAsync(targetUser.user_id);
            var followingCount = await _userRepository.GetFollowingCountAsync(targetUser.user_id);
            var isFollowing = await _userRepository.IsFollowingAsync(currentUser.user_id, targetUser.user_id);
            var isFollowingMe = await _userRepository.IsFollowingAsync(targetUser.user_id, currentUser.user_id);

            // RBAC: Determine account type from roles
            var isBusiness = targetUser.Account.AccountRoles.Any(ar => 
                ar.is_active && ar.Role.role_name == "Business");
            var isAdmin = targetUser.Account.AccountRoles.Any(ar => 
                ar.is_active && ar.Role.role_name == "Admin");
            var accountType = isAdmin ? "Admin" : (isBusiness ? "Business" : "User");

            return new PublicProfileDto
            {
                UserId = targetUser.user_id,
                Username = targetUser.username.Value,
                FullName = targetUser.full_name,
                AvatarUrl = targetUser.avatar_url?.Value,
                Bio = targetUser.bio,
                Website = targetUser.website,
                Address = targetUser.address,
                Hometown = targetUser.hometown,
                Gender = targetUser.gender.ToString(),
                PostsCount = postsCount,
                FollowersCount = followersCount,
                FollowingCount = followingCount,
                IsFollowing = isFollowing,
                IsFollowingMe = isFollowingMe,
                AccountType = accountType
            };
        }

        public async Task BlockUserAsync(int currentUserId, int targetUserId)
        {
            await _blockRepository.BlockUserAsync(currentUserId, targetUserId);
        }

        public async Task UnblockUserAsync(int currentUserId, int targetUserId)
        {
            await _blockRepository.UnblockUserAsync(currentUserId, targetUserId);
        }

        public async Task<object> GetBlockedUsersAsync(int currentUserId)
        {
            return await _blockRepository.GetBlockedUsersAsync(currentUserId);
        }

        public async Task FollowUserAsync(int currentUserId, int targetUserId)
        {
            await _userRepository.FollowUserAsync(currentUserId, targetUserId);
        }

        public async Task UnfollowUserAsync(int currentUserId, int targetUserId)
        {
            await _userRepository.UnfollowUserAsync(currentUserId, targetUserId);
        }

        public async Task<object> GetFollowersAsync(int userId)
        {
            return await _userRepository.GetFollowersListAsync(userId);
        }

        public async Task<object> GetFollowingAsync(int userId)
        {
            return await _userRepository.GetFollowingListAsync(userId);
        }
    }
}
