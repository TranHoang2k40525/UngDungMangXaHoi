using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.UseCases.Comments
{
    public class DeleteComment
    {
        private readonly ICommentRepository _commentRepository;
        private readonly IPostRepository _postRepository;

        public DeleteComment(ICommentRepository commentRepository, IPostRepository postRepository)
        {
            _commentRepository = commentRepository;
            _postRepository = postRepository;
        }

        public async Task<bool> ExecuteAsync(Guid commentId, Guid userId)
        {
            // Get comment
            var comment = await _commentRepository.GetByIdAsync(commentId);
            if (comment == null)
                throw new ArgumentException("Comment not found");

            // Check if user is the author
            if (comment.AuthorId != userId)
                throw new UnauthorizedAccessException("You can only delete your own comments");

            // Get post to update comment count
            var post = await _postRepository.GetByIdAsync(comment.PostId);
            if (post != null)
            {
                post.DecrementCommentCount();
                await _postRepository.UpdateAsync(post);
            }

            // Delete comment (soft delete)
            comment.Delete();
            await _commentRepository.UpdateAsync(comment);

            return true;
        }
    }
}

