using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Domain.DTOs;

namespace UngDungMangXaHoi.Application.UseCases.Posts
{
    public class CreatePost
    {
        private readonly IPostRepository _postRepository;
        private readonly IUserRepository _userRepository;

        public CreatePost(IPostRepository postRepository, IUserRepository userRepository)
        {
            _postRepository = postRepository;
            _userRepository = userRepository;
        }

        public async Task<PostDto> ExecuteAsync(Guid authorId, PostCreateDto postCreateDto)
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(postCreateDto.Content))
                throw new ArgumentException("Post content is required");

            if (postCreateDto.Content.Length > 2000)
                throw new ArgumentException("Post content cannot exceed 2000 characters");

            // Verify author exists
            var author = await _userRepository.GetByIdAsync(authorId);
            if (author == null)
                throw new ArgumentException("Author not found");

            if (!author.IsActive)
                throw new InvalidOperationException("Cannot create post for deactivated user");

            // Create post
            var post = new Post(authorId, postCreateDto.Content);

            // Add images if provided
            if (postCreateDto.ImageUrls != null)
            {
                foreach (var imageUrl in postCreateDto.ImageUrls)
                {
                    if (!string.IsNullOrWhiteSpace(imageUrl))
                    {
                        post.AddImage(new ImageUrl(imageUrl));
                    }
                }
            }

            // Add videos if provided
            if (postCreateDto.VideoUrls != null)
            {
                foreach (var videoUrl in postCreateDto.VideoUrls)
                {
                    if (!string.IsNullOrWhiteSpace(videoUrl))
                    {
                        post.AddVideo(videoUrl);
                    }
                }
            }

            // Save post
            var savedPost = await _postRepository.AddAsync(post);

            // Return DTO
            return new PostDto
            {
                Id = savedPost.Id,
                AuthorId = savedPost.AuthorId,
                AuthorName = $"{author.FirstName} {author.LastName}",
                AuthorUserName = author.UserName.Value,
                AuthorProfileImageUrl = author.ProfileImageUrl?.Value,
                Content = savedPost.Content,
                ImageUrls = savedPost.ImageUrls.ConvertAll(img => img.Value),
                VideoUrls = savedPost.VideoUrls,
                CreatedAt = savedPost.CreatedAt,
                UpdatedAt = savedPost.UpdatedAt,
                LikeCount = savedPost.LikeCount,
                CommentCount = savedPost.CommentCount,
                ShareCount = savedPost.ShareCount,
                IsLikedByCurrentUser = false,
                CanEdit = true,
                CanDelete = true
            };
        }
    }
}

