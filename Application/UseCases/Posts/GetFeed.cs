using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.DTOs;

namespace UngDungMangXaHoi.Application.UseCases.Posts
{
    public class GetFeed
    {
        private readonly IPostRepository _postRepository;
        private readonly IUserRepository _userRepository;
        private readonly IFriendshipRepository _friendshipRepository;

        public GetFeed(IPostRepository postRepository, IUserRepository userRepository, IFriendshipRepository friendshipRepository)
        {
            _postRepository = postRepository;
            _userRepository = userRepository;
            _friendshipRepository = friendshipRepository;
        }

        public async Task<PostFeedDto> ExecuteAsync(Guid userId, int pageNumber = 1, int pageSize = 10)
        {
            // Validate input
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1 || pageSize > 50) pageSize = 10;

            // Get user's friends
            var friends = await _friendshipRepository.GetAcceptedFriendsAsync(userId);
            var friendIds = friends.Select(f => f.Id).ToList();
            friendIds.Add(userId); // Include user's own posts

            // Get posts from friends and user
            var posts = await _postRepository.GetFeedAsync(userId, pageNumber, pageSize);
            var totalCount = await _postRepository.GetTotalPostsCountAsync();

            // Get authors for all posts
            var authorIds = posts.Select(p => p.AuthorId).Distinct().ToList();
            var authors = await _userRepository.GetUsersByIdsAsync(authorIds);
            var authorDict = authors.ToDictionary(a => a.Id, a => a);

            // Convert to DTOs
            var postDtos = posts.Select(post =>
            {
                var author = authorDict[post.AuthorId];
                return new PostDto
                {
                    Id = post.Id,
                    AuthorId = post.AuthorId,
                    AuthorName = $"{author.FirstName} {author.LastName}",
                    AuthorUserName = author.UserName.Value,
                    AuthorProfileImageUrl = author.ProfileImageUrl?.Value,
                    Content = post.Content,
                    ImageUrls = post.ImageUrls.ConvertAll(img => img.Value),
                    VideoUrls = post.VideoUrls,
                    CreatedAt = post.CreatedAt,
                    UpdatedAt = post.UpdatedAt,
                    LikeCount = post.LikeCount,
                    CommentCount = post.CommentCount,
                    ShareCount = post.ShareCount,
                    IsLikedByCurrentUser = false, // TODO: Check if user liked this post
                    CanEdit = post.AuthorId == userId,
                    CanDelete = post.AuthorId == userId
                };
            }).ToList();

            return new PostFeedDto
            {
                Posts = postDtos,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize,
                HasNextPage = (pageNumber * pageSize) < totalCount,
                HasPreviousPage = pageNumber > 1
            };
        }
    }
}

