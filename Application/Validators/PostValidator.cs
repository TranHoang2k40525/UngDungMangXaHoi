using System;
using UngDungMangXaHoi.Domain.DTOs;

namespace UngDungMangXaHoi.Application.Validators
{
    public class PostValidator
    {
        public static ValidationResult ValidatePostCreate(PostCreateDto postCreateDto)
        {
            var result = new ValidationResult();

            // Validate Content
            if (string.IsNullOrWhiteSpace(postCreateDto.Content))
            {
                result.AddError("Content", "Post content is required");
            }
            else if (postCreateDto.Content.Length > 2000)
            {
                result.AddError("Content", "Post content cannot exceed 2000 characters");
            }

            // Validate ImageUrls
            if (postCreateDto.ImageUrls != null && postCreateDto.ImageUrls.Count > 10)
            {
                result.AddError("ImageUrls", "Cannot upload more than 10 images");
            }

            // Validate VideoUrls
            if (postCreateDto.VideoUrls != null && postCreateDto.VideoUrls.Count > 3)
            {
                result.AddError("VideoUrls", "Cannot upload more than 3 videos");
            }

            return result;
        }

        public static ValidationResult ValidatePostUpdate(PostUpdateDto postUpdateDto)
        {
            var result = new ValidationResult();

            // Validate Content
            if (string.IsNullOrWhiteSpace(postUpdateDto.Content))
            {
                result.AddError("Content", "Post content is required");
            }
            else if (postUpdateDto.Content.Length > 2000)
            {
                result.AddError("Content", "Post content cannot exceed 2000 characters");
            }

            // Validate ImageUrls
            if (postUpdateDto.ImageUrls != null && postUpdateDto.ImageUrls.Count > 10)
            {
                result.AddError("ImageUrls", "Cannot upload more than 10 images");
            }

            // Validate VideoUrls
            if (postUpdateDto.VideoUrls != null && postUpdateDto.VideoUrls.Count > 3)
            {
                result.AddError("VideoUrls", "Cannot upload more than 3 videos");
            }

            return result;
        }
    }
}

