using System;
using UngDungMangXaHoi.Domain.DTOs;

namespace UngDungMangXaHoi.Application.Validators
{
    public class CommentValidator
    {
        public static ValidationResult ValidateCommentCreate(CommentCreateDto commentCreateDto)
        {
            var result = new ValidationResult();

            // Validate PostId
            if (commentCreateDto.PostId == Guid.Empty)
            {
                result.AddError("PostId", "Post ID is required");
            }

            // Validate Content
            if (string.IsNullOrWhiteSpace(commentCreateDto.Content))
            {
                result.AddError("Content", "Comment content is required");
            }
            else if (commentCreateDto.Content.Length > 500)
            {
                result.AddError("Content", "Comment content cannot exceed 500 characters");
            }

            return result;
        }

        public static ValidationResult ValidateCommentUpdate(CommentUpdateDto commentUpdateDto)
        {
            var result = new ValidationResult();

            // Validate Content
            if (string.IsNullOrWhiteSpace(commentUpdateDto.Content))
            {
                result.AddError("Content", "Comment content is required");
            }
            else if (commentUpdateDto.Content.Length > 500)
            {
                result.AddError("Content", "Comment content cannot exceed 500 characters");
            }

            return result;
        }
    }
}

