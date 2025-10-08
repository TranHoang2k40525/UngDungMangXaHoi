using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.UseCases.Posts
{
    public class DeletePost
    {
        private readonly IPostRepository _postRepository;

        public DeletePost(IPostRepository postRepository)
        {
            _postRepository = postRepository;
        }

        public async Task<bool> ExecuteAsync(Guid postId, Guid userId)
        {
            // Get post
            var post = await _postRepository.GetByIdAsync(postId);
            if (post == null)
                throw new ArgumentException("Post not found");

            // Check if user is the author
            if (post.AuthorId != userId)
                throw new UnauthorizedAccessException("You can only delete your own posts");

            // Delete post (soft delete)
            post.Delete();
            await _postRepository.UpdateAsync(post);

            return true;
        }
    }
}

