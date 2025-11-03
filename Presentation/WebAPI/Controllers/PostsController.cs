using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    [ApiController]
    [Route("api/posts")]
    [Authorize]
    public class PostsController : ControllerBase
    {
    private readonly IPostRepository _postRepository;
    private readonly IUserRepository _userRepository;
    private readonly UngDungMangXaHoi.Infrastructure.Services.VideoTranscodeService _videoTranscoder;

        public PostsController(IPostRepository postRepository, IUserRepository userRepository, UngDungMangXaHoi.Infrastructure.Services.VideoTranscodeService videoTranscoder)
        {
            _postRepository = postRepository;
            _userRepository = userRepository;
            _videoTranscoder = videoTranscoder;
        }

        // DTO for create request via multipart/form-data
        public class CreatePostForm
        {
            public string? Caption { get; set; }
            public string? Location { get; set; }
            public string Privacy { get; set; } = "public"; // public | private | followers
            public List<IFormFile>? Images { get; set; }
            public IFormFile? Video { get; set; }
        }

        // DTOs for update operations
        public class UpdatePrivacyDto
        {
            public string Privacy { get; set; } = "public"; // public | private | followers
        }

        public class UpdateCaptionDto
        {
            public string Caption { get; set; } = string.Empty;
        }

    [HttpPost]
    [Consumes("multipart/form-data")]
        [RequestFormLimits(MultipartBodyLengthLimit = 150_000_000)] // 150MB total
        [RequestSizeLimit(150_000_000)]
        public async Task<IActionResult> CreatePost([FromForm] CreatePostForm form)
        {
            // Validate privacy
            var allowedPrivacy = new[] { "public", "private", "followers" };
            var incomingPrivacy = (form.Privacy ?? "public").Trim().ToLowerInvariant();
            if (!allowedPrivacy.Contains(incomingPrivacy))
            {
                return BadRequest(new { message = "privacy phải là public/private/followers" });
            }

            // Get accountId then user
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                return Unauthorized(new { message = "Token không hợp lệ!" });
            }

            var user = await _userRepository.GetByAccountIdAsync(accountId);
            if (user == null)
            {
                return BadRequest(new { message = "Không tìm thấy user tương ứng với tài khoản." });
            }

            // Validate media
            var images = form.Images ?? new List<IFormFile>();
            var video = form.Video;
            if (images.Count == 0 && video == null)
            {
                return BadRequest(new { message = "Bài đăng phải có ít nhất 1 ảnh hoặc 1 video." });
            }

            if (video != null && video.Length > 100L * 1024 * 1024)
            {
                return BadRequest(new { message = "Video vượt quá dung lượng tối đa 100MB." });
            }

            // Validate file extensions
            var allowedImageExt = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            foreach (var img in images)
            {
                var ext = Path.GetExtension(img.FileName).ToLowerInvariant();
                if (!allowedImageExt.Contains(ext))
                {
                    return BadRequest(new { message = $"Ảnh không hợp lệ: {img.FileName}" });
                }
            }

            if (video != null)
            {
                var allowedVideoExt = new[] { ".mp4", ".mov", ".m4v", ".avi", ".wmv", ".mkv" };
                var vext = Path.GetExtension(video.FileName).ToLowerInvariant();
                if (!allowedVideoExt.Contains(vext))
                {
                    return BadRequest(new { message = "Định dạng video không hợp lệ." });
                }
            }

            // Create post first
            var post = new Post
            {
                user_id = user.user_id,
                caption = form.Caption,
                location = form.Location,
                privacy = incomingPrivacy,
                is_visible = true,
                created_at = DateTimeOffset.UtcNow
            };

            var createdPost = await _postRepository.AddAsync(post);

            // Prepare directories
            var root = Directory.GetCurrentDirectory();
            var imagesDir = Path.Combine(root, "Assets", "Images");
            var videosDir = Path.Combine(root, "Assets", "Videos");
            if (!Directory.Exists(imagesDir)) Directory.CreateDirectory(imagesDir);
            if (!Directory.Exists(videosDir)) Directory.CreateDirectory(videosDir);

            // Save images
            int order = 0;
            foreach (var img in images)
            {
                var ext = Path.GetExtension(img.FileName).ToLowerInvariant();
                var fileName = $"{user.username.Value}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
                var filePath = Path.Combine(imagesDir, fileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await img.CopyToAsync(stream);
                }

                // Lưu vào DB: chỉ tên file theo yêu cầu
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

            // Save single video if provided
            if (video != null)
            {
                var vext = Path.GetExtension(video.FileName).ToLowerInvariant();
                var vname = $"{user.username.Value}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{vext}";
                var vpath = Path.Combine(videosDir, vname);
                using (var vstream = new FileStream(vpath, FileMode.Create))
                {
                    await video.CopyToAsync(vstream);
                }

                // Attempt to normalize for broad compatibility; keep original if transcoding fails
                try
                {
                    var compatPath = await _videoTranscoder.TryNormalizeAsync(vpath, videosDir);
                    if (!string.IsNullOrEmpty(compatPath) && System.IO.File.Exists(compatPath))
                    {
                        // Switch to compat file for serving
                        vname = Path.GetFileName(compatPath);
                    }
                }
                catch { /* ignore and fall back to original */ }

                var vmedia = new PostMedia
                {
                    post_id = createdPost.post_id,
                    media_url = vname, // chỉ lưu tên file
                    media_type = "Video",
                    media_order = order,
                    created_at = DateTimeOffset.UtcNow
                };
                await _postRepository.AddMediaAsync(vmedia);
            }

            return Ok(new { message = "Đăng bài thành công", PostId = createdPost.post_id });
        }

        [HttpGet("feed")]
        [AllowAnonymous]
        public async Task<IActionResult> GetFeed([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            int? currentUserId = null;
            try
            {
                var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(accountIdStr) && int.TryParse(accountIdStr, out var accountId))
                {
                    var u = await _userRepository.GetByAccountIdAsync(accountId);
                    if (u != null) currentUserId = u.user_id;
                }
            }
            catch { }

            var posts = await _postRepository.GetFeedAsync(currentUserId, Math.Max(1, page), Math.Clamp(pageSize, 1, 50));
            return Ok(posts.Select(MapPostToDto));
        }

        [HttpGet("reels")]
        [AllowAnonymous]
        public async Task<IActionResult> GetReels([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            int? currentUserId = null;
            try
            {
                var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(accountIdStr) && int.TryParse(accountIdStr, out var accountId))
                {
                    var u = await _userRepository.GetByAccountIdAsync(accountId);
                    if (u != null) currentUserId = u.user_id;
                }
            }
            catch { }

            var posts = await _postRepository.GetVideoPostsAsync(currentUserId, Math.Max(1, page), Math.Clamp(pageSize, 1, 50));
            return Ok(posts.Select(MapPostToDto));
        }

        [HttpGet("reels/all")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllReels()
        {
            int? currentUserId = null;
            try
            {
                var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(accountIdStr) && int.TryParse(accountIdStr, out var accountId))
                {
                    var u = await _userRepository.GetByAccountIdAsync(accountId);
                    if (u != null) currentUserId = u.user_id;
                }
            }
            catch { }

            var posts = await _postRepository.GetAllVideoPostsAsync(currentUserId);
            return Ok(posts.Select(MapPostToDto));
        }

        [HttpGet("reels/following")]
        public async Task<IActionResult> GetFollowingReels([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                return Unauthorized(new { message = "Token không hợp lệ!" });
            }

            var currentUser = await _userRepository.GetByAccountIdAsync(accountId);
            if (currentUser == null)
            {
                return Unauthorized(new { message = "Người dùng không tồn tại!" });
            }

            var posts = await _postRepository.GetFollowingVideoPostsAsync(currentUser.user_id, Math.Max(1, page), Math.Clamp(pageSize, 1, 50));
            return Ok(posts.Select(MapPostToDto));
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMyPosts([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                return Unauthorized(new { message = "Token không hợp lệ!" });
            }
            var user = await _userRepository.GetByAccountIdAsync(accountId);
            if (user == null) return BadRequest(new { message = "Không tìm thấy user." });

            var posts = await _postRepository.GetUserPostsAsync(user.user_id, Math.Max(1, page), Math.Clamp(pageSize, 1, 50));
            return Ok(posts.Select(MapPostToDto));
        }

        [HttpGet("user/{userId:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserPosts([FromRoute] int userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            int? currentUserId = null;
            try
            {
                var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(accountIdStr) && int.TryParse(accountIdStr, out var accountId))
                {
                    var u = await _userRepository.GetByAccountIdAsync(accountId);
                    if (u != null) currentUserId = u.user_id;
                }
            }
            catch { }

            var posts = await _postRepository.GetUserPostsForViewerAsync(userId, currentUserId, Math.Max(1, page), Math.Clamp(pageSize, 1, 50));
            return Ok(posts.Select(MapPostToDto));
        }

        private object MapPostToDto(Post p)
        {
            string BaseUrl(string path) => $"{Request.Scheme}://{Request.Host}{path}";

            var media = p.Media
                .OrderBy(m => m.media_order)
                .Select(m =>
                {
                    string type = m.media_type;
                    string url;
                    string? altUrl = null;

                    if (type.Equals("video", StringComparison.OrdinalIgnoreCase))
                    {
                        url = BaseUrl($"/Assets/Videos/{m.media_url}");
                        try
                        {
                            var root = Directory.GetCurrentDirectory();
                            var videosDir = Path.Combine(root, "Assets", "Videos");
                            var nameNoExt = Path.GetFileNameWithoutExtension(m.media_url);
                            var compatName = nameNoExt + "_compat.mp4";
                            var compatPath = Path.Combine(videosDir, compatName);
                            if (System.IO.File.Exists(compatPath))
                            {
                                altUrl = BaseUrl($"/Assets/Videos/{compatName}");
                            }
                        }
                        catch { }
                    }
                    else
                    {
                        url = BaseUrl($"/Assets/Images/{m.media_url}");
                    }

                    return new { type, url, altUrl };
                });

            return new
            {
                id = p.post_id,
                caption = p.caption,
                location = p.location,
                privacy = p.privacy,
                createdAt = p.created_at,
                user = new
                {
                    id = p.User?.user_id,
                    username = p.User?.username.Value,
                    avatarUrl = p.User?.avatar_url?.Value != null ? BaseUrl(p.User.avatar_url.Value) : null
                },
                media = media
            };
        }

        [HttpPatch("{id:int}/privacy")]
        public async Task<IActionResult> UpdatePrivacy([FromRoute] int id, [FromBody] UpdatePrivacyDto dto)
        {
            var allowedPrivacy = new[] { "public", "private", "followers" };
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
                return Unauthorized(new { message = "Token không hợp lệ!" });

            var user = await _userRepository.GetByAccountIdAsync(accountId);
            if (user == null) return BadRequest(new { message = "Không tìm thấy user." });

            var post = await _postRepository.GetByIdAsync(id);
            if (post == null) return NotFound(new { message = "Không tìm thấy bài đăng." });
            if (post.user_id != user.user_id) return Forbid();

            var incomingPrivacy = (dto?.Privacy ?? "public").Trim().ToLowerInvariant();
            if (!allowedPrivacy.Contains(incomingPrivacy))
                return BadRequest(new { message = "privacy phải là public/private/followers" });

            post.privacy = incomingPrivacy;
            await _postRepository.UpdateAsync(post);

            // return latest with media for client update
            var updated = await _postRepository.GetByIdWithMediaAsync(id) ?? post;
            return Ok(MapPostToDto(updated));
        }

        [HttpPatch("{id:int}/caption")]
        public async Task<IActionResult> UpdateCaption([FromRoute] int id, [FromBody] UpdateCaptionDto dto)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
                return Unauthorized(new { message = "Token không hợp lệ!" });

            var user = await _userRepository.GetByAccountIdAsync(accountId);
            if (user == null) return BadRequest(new { message = "Không tìm thấy user." });

            var post = await _postRepository.GetByIdAsync(id);
            if (post == null) return NotFound(new { message = "Không tìm thấy bài đăng." });
            if (post.user_id != user.user_id) return Forbid();

            var caption = dto?.Caption?.Trim() ?? string.Empty;
            if (caption.Length > 2200)
                return BadRequest(new { message = "Caption tối đa 2200 ký tự" });

            post.caption = caption;
            await _postRepository.UpdateAsync(post);

            var updated = await _postRepository.GetByIdWithMediaAsync(id) ?? post;
            return Ok(MapPostToDto(updated));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeletePost([FromRoute] int id)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
                return Unauthorized(new { message = "Token không hợp lệ!" });

            var user = await _userRepository.GetByAccountIdAsync(accountId);
            if (user == null) return BadRequest(new { message = "Không tìm thấy user." });

            var post = await _postRepository.GetByIdWithMediaAsync(id);
            if (post == null) return NotFound(new { message = "Không tìm thấy bài đăng." });
            if (post.user_id != user.user_id) return Forbid();

            // Delete files on disk best-effort
            try
            {
                var root = Directory.GetCurrentDirectory();
                var imagesDir = Path.Combine(root, "Assets", "Images");
                var videosDir = Path.Combine(root, "Assets", "Videos");
                foreach (var m in post.Media)
                {
                    var isVideo = m.media_type.Equals("video", StringComparison.OrdinalIgnoreCase);
                    var fullPath = Path.Combine(isVideo ? videosDir : imagesDir, m.media_url);
                    if (System.IO.File.Exists(fullPath))
                    {
                        try { System.IO.File.Delete(fullPath); } catch { /* ignore */ }
                    }
                }
            }
            catch { /* ignore file deletion errors */ }

            await _postRepository.DeleteAsync(id);
            return NoContent();
        }
    }
}
