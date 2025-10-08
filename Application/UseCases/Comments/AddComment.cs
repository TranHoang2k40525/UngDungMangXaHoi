using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.DTOs;

namespace UngDungMangXaHoi.Application.UseCases.Comments
{
    public class AddComment
    {
        private readonly ICommentRepository _commentRepository;
        private readonly IPostRepository _postRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationService _notificationService;

        public AddComment(
            ICommentRepository commentRepository,
            IPostRepository postRepository,
            IUserRepository userRepository,
            INotificationService notificationService)
        {
            _commentRepository = commentRepository;
            _postRepository = postRepository;
            _userRepository = userRepository;
            _notificationService = notificationService;
        }

        public async Task<CommentDto> ExecuteAsync(Guid authorId, CommentCreateDto commentCreateDto)
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(commentCreateDto.Content))
                throw new ArgumentException("Comment content is required");

            if (commentCreateDto.Content.Length > 500)
                throw new ArgumentException("Comment content cannot exceed 500 characters");

            // Verify post exists
            var post = await _postRepository.GetByIdAsync(commentCreateDto.PostId);
            if (post == null)
                throw new ArgumentException("Post not found");

            if (post.IsDeleted)
                throw new InvalidOperationException("Cannot comment on deleted post");

            // Verify author exists
            var author = await _userRepository.GetByIdAsync(authorId);
            if (author == null)
                throw new ArgumentException("Author not found");

            if (!author.IsActive)
                throw new InvalidOperationException("Cannot create comment for deactivated user");

            // Verify parent comment exists if provided
            if (commentCreateDto.ParentCommentId.HasValue)
            {
                var parentComment = await _commentRepository.GetByIdAsync(commentCreateDto.ParentCommentId.Value);
                if (parentComment == null)
                    throw new ArgumentException("Parent comment not found");

                if (parentComment.IsDeleted)
                    throw new InvalidOperationException("Cannot reply to deleted comment");
            }

            // Create comment
            var comment = new Comment(
                commentCreateDto.PostId,
                authorId,
                commentCreateDto.Content,
                commentCreateDto.ParentCommentId
            );

            // Save comment
            var savedComment = await _commentRepository.AddAsync(comment);

            // Update post comment count
            post.IncrementCommentCount();
            await _postRepository.UpdateAsync(post);

            // Send notification to post author (if not the same as commenter)
            if (post.AuthorId != authorId)
            {
                await _notificationService.SendCommentNotificationAsync(
                    post.AuthorId,
                    authorId,
                    post.Id,
                    savedComment.Id
                );
            }

            // Return DTO
            return new CommentDto
            {
                Id = savedComment.Id,
                PostId = savedComment.PostId,
                AuthorId = savedComment.AuthorId,
                AuthorName = $"{author.FirstName} {author.LastName}",
                AuthorUserName = author.UserName.Value,
                AuthorProfileImageUrl = author.ProfileImageUrl?.Value,
                ParentCommentId = savedComment.ParentCommentId,
                Content = savedComment.Content,
                CreatedAt = savedComment.CreatedAt,
                UpdatedAt = savedComment.UpdatedAt,
                LikeCount = savedComment.LikeCount,
                IsLikedByCurrentUser = false,
                CanEdit = true,
                CanDelete = true,
                Replies = new List<CommentDto>()
            };
        }
    }
}

