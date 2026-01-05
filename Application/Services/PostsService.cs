using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    public class PostsService
    {
        private readonly IPostRepository _postRepository;
        private readonly IUserRepository _userRepository;
        private readonly ICommentRepository _commentRepository;
        private readonly UngDungMangXaHoi.Infrastructure.Services.VideoTranscodeService _videoTranscoder;

        public PostsService(IPostRepository postRepository, IUserRepository userRepository, ICommentRepository commentRepository, UngDungMangXaHoi.Infrastructure.Services.VideoTranscodeService videoTranscoder)
        {
            _postRepository = postRepository;
            _userRepository = userRepository;
            _commentRepository = commentRepository;
            _videoTranscoder = videoTranscoder;
        }

        public async Task<int> CreatePostAsync(int accountId, CreatePostForm form)
        {
            // Validate privacy
            var allowedPrivacy = new[] { "public", "private", "followers" };
            var incomingPrivacy = (form.Privacy ?? "public").Trim().ToLowerInvariant();
            if (!allowedPrivacy.Contains(incomingPrivacy)) throw new ArgumentException("privacy phải là public/private/followers");

            var user = await _userRepository.GetByAccountIdAsync(accountId);
            if (user == null) throw new InvalidOperationException("User not found for account");

            var images = form.Images ?? new List<IFormFile>();
            var video = form.Video;
            if (images.Count == 0 && video == null) throw new ArgumentException("Bài đăng phải có ít nhất 1 ảnh hoặc 1 video.");

            if (video != null && video.Length > 100L * 1024 * 1024) throw new ArgumentException("Video vượt quá dung lượng tối đa 100MB.");            var allowedImageExt = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            foreach (var img in images)
            {
                var fileName = img.FileName ?? "";
                
                // If no filename or no extension, check ContentType
                var ext = Path.GetExtension(fileName).ToLowerInvariant();
                if (string.IsNullOrEmpty(ext))
                {
                    // Try to infer from ContentType
                    var contentType = img.ContentType?.ToLowerInvariant() ?? "";
                    if (contentType.Contains("jpeg") || contentType.Contains("jpg"))
                        ext = ".jpg";
                    else if (contentType.Contains("png"))
                        ext = ".png";
                    else if (contentType.Contains("gif"))
                        ext = ".gif";
                    else if (contentType.Contains("webp"))
                        ext = ".webp";
                    else
                        ext = ".jpg"; // Default fallback for image/* types
                }
                
                if (!allowedImageExt.Contains(ext))
                    throw new ArgumentException($"Ảnh không hợp lệ: {fileName}");
            }

            if (video != null)
            {
                var allowedVideoExt = new[] { ".mp4", ".mov", ".m4v", ".avi", ".wmv", ".mkv" };
                var vext = Path.GetExtension(video.FileName).ToLowerInvariant();
                if (!allowedVideoExt.Contains(vext)) throw new ArgumentException("Định dạng video không hợp lệ.");
            }

            int[]? mentionIds = null;
            int[]? tagIds = null;
            try { if (!string.IsNullOrEmpty(form.Mentions)) mentionIds = System.Text.Json.JsonSerializer.Deserialize<int[]>(form.Mentions); } catch { }
            try { if (!string.IsNullOrEmpty(form.Tags)) tagIds = System.Text.Json.JsonSerializer.Deserialize<int[]>(form.Tags); } catch { }

            var post = new Post
            {
                user_id = user.user_id,
                caption = form.Caption,
                location = form.Location,
                privacy = incomingPrivacy,
                is_visible = true,
                created_at = DateTimeOffset.UtcNow,
                MentionedUserIds = (mentionIds != null && mentionIds.Length > 0) ? string.Join(",", mentionIds) : null,
                TaggedUserIds = (tagIds != null && tagIds.Length > 0) ? string.Join(",", tagIds) : null
            };

            var createdPost = await _postRepository.AddAsync(post);

            var root = Directory.GetCurrentDirectory();
            var imagesDir = Path.Combine(root, "Assets", "Images");
            var videosDir = Path.Combine(root, "Assets", "Videos");
            if (!Directory.Exists(imagesDir)) Directory.CreateDirectory(imagesDir);
            if (!Directory.Exists(videosDir)) Directory.CreateDirectory(videosDir);

            int order = 0;
            foreach (var img in images)
            {
                var ext = Path.GetExtension(img.FileName).ToLowerInvariant();
                var fileName = $"{user.username.Value}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
                var filePath = Path.Combine(imagesDir, fileName);
                using (var stream = new FileStream(filePath, FileMode.Create)) { await img.CopyToAsync(stream); }

                var media = new PostMedia
                {
                    post_id = createdPost.post_id,
                    media_url = fileName,
                    media_type = "Image",
                    media_order = order++,
                    created_at = DateTimeOffset.UtcNow
                };
                await _postRepository.AddMediaAsync(media);
            }

            if (video != null)
            {
                var vext = Path.GetExtension(video.FileName).ToLowerInvariant();
                var vname = $"{user.username.Value}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{vext}";
                var vpath = Path.Combine(videosDir, vname);
                using (var vstream = new FileStream(vpath, FileMode.Create)) { await video.CopyToAsync(vstream); }

                try
                {
                    var compatPath = await _videoTranscoder.TryNormalizeAsync(vpath, videosDir);
                    if (!string.IsNullOrEmpty(compatPath) && System.IO.File.Exists(compatPath)) vname = Path.GetFileName(compatPath);
                }
                catch { }

                var vmedia = new PostMedia
                {
                    post_id = createdPost.post_id,
                    media_url = vname,
                    media_type = "Video",
                    media_order = order,
                    created_at = DateTimeOffset.UtcNow
                };
                await _postRepository.AddMediaAsync(vmedia);
            }

            return createdPost.post_id;
        }
    }
}
