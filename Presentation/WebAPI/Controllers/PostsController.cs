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
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Services;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    [ApiController]
    [Route("api/posts")]
    [Authorize]
    public class PostsController : ControllerBase
    {
    private readonly IPostRepository _postRepository;
    private readonly IUserRepository _userRepository;
    private readonly ICommentRepository _commentRepository;
    private readonly PostsService _postsService;
    private readonly BusinessPostInjectionService _businessPostInjectionService;
    private readonly UserPostPrioritizationService _userPostPrioritizationService;

        public PostsController(
            IPostRepository postRepository,
            IUserRepository userRepository,
            ICommentRepository commentRepository,
            Application.Services.PostsService postsService,
            BusinessPostInjectionService businessPostInjectionService,
            UserPostPrioritizationService userPostPrioritizationService)
        {
            _postRepository = postRepository;
            _userRepository = userRepository;
            _commentRepository = commentRepository;
            _postsService = postsService;
            _businessPostInjectionService = businessPostInjectionService;
            _userPostPrioritizationService = userPostPrioritizationService;
        }

        // Using DTOs from Application.DTOs: CreatePostForm, UpdatePrivacyDto, UpdateCaptionDto, UpdateTagsDto

    [HttpPost]
    [Consumes("multipart/form-data")]
        [RequestFormLimits(MultipartBodyLengthLimit = 150_000_000)] // 150MB total
        [RequestSizeLimit(150_000_000)]
        public async Task<IActionResult> CreatePost(CreatePostForm form)
            {
                var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
                {

                    return Unauthorized(new { message = "Token không hợp lệ!" });

                }

                try
                {
                    var postId = await _postsService.CreatePostAsync(accountId, form);
                    return Ok(new { message = "Đăng bài thành công", PostId = postId });
                }
                catch (ArgumentException aex)
                {
                    return BadRequest(new { message = aex.Message });
                }
                catch (InvalidOperationException iex)
                {
                    return BadRequest(new { message = iex.Message });
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { message = ex.Message });
                }
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
            
            // Bước 1: Sắp xếp ưu tiên User posts dựa vào lịch sử tìm kiếm
            var prioritizedUserPosts = await _userPostPrioritizationService.PrioritizeAndMixUserPostsAsync(
                posts.ToList(), 
                currentUserId);
            
            // Bước 2: Chèn bài Business vào feed đã được prioritize
            var mergedFeed = await _businessPostInjectionService.InjectBusinessPostsIntoFeedAsync(
                prioritizedUserPosts, 
                currentUserId);
            
            // Load comment counts for all posts
            var postIds = mergedFeed.Select(p => p.post_id).ToList();
            var commentCounts = new Dictionary<int, int>();
            foreach (var postId in postIds)
            {
                var count = await _commentRepository.GetCommentCountByPostIdAsync(postId);
                commentCounts[postId] = count;
            }
            
            var dtoList = new List<object>();
            foreach (var pp in mergedFeed)
            {
                dtoList.Add(await MapPostToDtoAsync(pp, commentCounts.GetValueOrDefault(pp.post_id, 0)));
            }
            return Ok(dtoList);
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
            
            // Bước 1: Sắp xếp ưu tiên User video posts dựa vào lịch sử tìm kiếm
            var prioritizedUserPosts = await _userPostPrioritizationService.PrioritizeAndMixUserPostsAsync(
                posts.ToList(), 
                currentUserId);
            
            // Bước 2: Chèn bài Business video vào reels đã được prioritize
            var mergedReels = await _businessPostInjectionService.InjectBusinessPostsIntoFeedAsync(
                prioritizedUserPosts, 
                currentUserId);
            
            // Load comment counts
            var postIds = mergedReels.Select(p => p.post_id).ToList();
            var commentCounts = new Dictionary<int, int>();
            foreach (var postId in postIds)
            {
                var count = await _commentRepository.GetCommentCountByPostIdAsync(postId);
                commentCounts[postId] = count;
            }
            
            var dtoList2 = new List<object>();
            foreach (var pp in mergedReels)
            {
                dtoList2.Add(await MapPostToDtoAsync(pp, commentCounts.GetValueOrDefault(pp.post_id, 0)));
            }
            return Ok(dtoList2);
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
            
            // Bước 1: Sắp xếp ưu tiên User video posts dựa vào lịch sử tìm kiếm
            var prioritizedUserPosts = await _userPostPrioritizationService.PrioritizeAndMixUserPostsAsync(
                posts.ToList(), 
                currentUserId);
            
            // Bước 2: Chèn bài Business video vào all reels đã được prioritize
            var mergedReels = await _businessPostInjectionService.InjectBusinessPostsIntoFeedAsync(
                prioritizedUserPosts, 
                currentUserId);
            
            // Load comment counts
            var postIds = mergedReels.Select(p => p.post_id).ToList();
            var commentCounts = new Dictionary<int, int>();
            foreach (var postId in postIds)
            {
                var count = await _commentRepository.GetCommentCountByPostIdAsync(postId);
                commentCounts[postId] = count;
            }
            
            var dtoList3 = new List<object>();
            foreach (var pp in mergedReels)
            {
                dtoList3.Add(await MapPostToDtoAsync(pp, commentCounts.GetValueOrDefault(pp.post_id, 0)));
            }
            return Ok(dtoList3);
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
            
            // Load comment counts
            var postIds = posts.Select(p => p.post_id).ToList();
            var commentCounts = new Dictionary<int, int>();
            foreach (var postId in postIds)
            {
                var count = await _commentRepository.GetCommentCountByPostIdAsync(postId);
                commentCounts[postId] = count;
            }
            
            var dtoList4 = new List<object>();
            foreach (var pp in posts)
            {
                dtoList4.Add(await MapPostToDtoAsync(pp, commentCounts.GetValueOrDefault(pp.post_id, 0)));
            }
            return Ok(dtoList4);
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
            
            // Load comment counts
            var postIds = posts.Select(p => p.post_id).ToList();
            var commentCounts = new Dictionary<int, int>();
            foreach (var postId in postIds)
            {
                var count = await _commentRepository.GetCommentCountByPostIdAsync(postId);
                commentCounts[postId] = count;
            }
            
            var dtoList5 = new List<object>();
            foreach (var pp in posts)
            {
                dtoList5.Add(await MapPostToDtoAsync(pp, commentCounts.GetValueOrDefault(pp.post_id, 0)));
            }
            return Ok(dtoList5);
        }

    // GET: api/posts/{id} - Lấy thông tin 1 post theo ID
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPostById([FromRoute] int id)
        {
            try
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

                var post = await _postRepository.GetByIdWithMediaAsync(id);
                if (post == null)
                {
                    return NotFound(new { message = "Post not found" });
                }

                // Kiểm tra quyền xem post
                if (post.privacy == "private" && currentUserId != post.user_id)
                {
                    return Forbid();
                }

                // Load comment count
                var commentsCount = await _commentRepository.GetCommentCountByPostIdAsync(id);

                var postDto = await MapPostToDtoAsync(post, commentsCount);
                return Ok(postDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error retrieving post", error = ex.Message });
            }
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
            
            // Load comment counts
            var postIds = posts.Select(p => p.post_id).ToList();
            var commentCounts = new Dictionary<int, int>();
            foreach (var postId in postIds)
            {
                var count = await _commentRepository.GetCommentCountByPostIdAsync(postId);
                commentCounts[postId] = count;
            }
            
            var dtoList6 = new List<object>();
            foreach (var pp in posts)
            {
                dtoList6.Add(await MapPostToDtoAsync(pp, commentCounts.GetValueOrDefault(pp.post_id, 0)));
            }
            return Ok(dtoList6);
        }

    private object MapPostToDto(Post p, int commentsCount = 0)
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
                commentsCount = commentsCount,
                user = new
                {
                    id = p.User?.user_id,
                    username = p.User?.username.Value,
                    avatarUrl = p.User?.avatar_url?.Value != null ? BaseUrl(p.User.avatar_url.Value) : null
                },
                media = media
            };
        }

        private async Task<object> MapPostToDtoAsync(Post p, int commentsCount = 0)
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

            // resolve mentioned and tagged users
            List<object> mentions = new List<object>();
            List<object> tags = new List<object>();
            try
            {
                if (!string.IsNullOrEmpty(p.MentionedUserIds))
                {
                    var ids = p.MentionedUserIds.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => int.TryParse(s, out var v) ? v : 0).Where(i => i > 0).ToList();
                    if (ids.Count > 0)
                    {
                        var users = await _userRepository.GetUsersByIdsAsync(ids);
                        mentions.AddRange(users.Select(u => new {
                            id = u.user_id,
                            username = u.username.Value,
                            avatarUrl = u.avatar_url?.Value != null ? BaseUrl(u.avatar_url.Value) : null
                        }));
                    }
                }
            }
            catch { }

            try
            {
                if (!string.IsNullOrEmpty(p.TaggedUserIds))
                {
                    var ids = p.TaggedUserIds.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => int.TryParse(s, out var v) ? v : 0).Where(i => i > 0).ToList();
                    if (ids.Count > 0)
                    {
                        var users = await _userRepository.GetUsersByIdsAsync(ids);
                        tags.AddRange(users.Select(u => new {
                            id = u.user_id,
                            username = u.username.Value,
                            avatarUrl = u.avatar_url?.Value != null ? BaseUrl(u.avatar_url.Value) : null
                        }));
                    }
                }
            }
            catch { }
            bool isSponsored = p.User?.Account?.account_type == AccountType.Business;

            return new
            {
                id = p.post_id,
                caption = p.caption,
                location = p.location,
                privacy = p.privacy,
                createdAt = p.created_at,
                commentsCount = commentsCount,
                isSponsored = isSponsored,

                user = new
                {
                    id = p.User?.user_id,
                    username = p.User?.username.Value,
                    avatarUrl = p.User?.avatar_url?.Value != null ? BaseUrl(p.User.avatar_url.Value) : null,
                    accountType = p.User?.Account?.account_type.ToString(),

                },
                media = media,
                mentions = mentions,
                tags = tags
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
            var commentsCount = await _commentRepository.GetCommentCountByPostIdAsync(id);
            return Ok(await MapPostToDtoAsync(updated, commentsCount));
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
            var commentsCount = await _commentRepository.GetCommentCountByPostIdAsync(id);
            return Ok(await MapPostToDtoAsync(updated, commentsCount));
        }

        [HttpPatch("{id:int}/tags")]
        public async Task<IActionResult> UpdateTags([FromRoute] int id, [FromBody] UpdateTagsDto dto)
        {
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
                return Unauthorized(new { message = "Token không hợp lệ!" });

            var user = await _userRepository.GetByAccountIdAsync(accountId);
            if (user == null) return BadRequest(new { message = "Không tìm thấy user." });

            var post = await _postRepository.GetByIdAsync(id);
            if (post == null) return NotFound(new { message = "Không tìm thấy bài đăng." });
            if (post.user_id != user.user_id) return Forbid();

            // Accept list of user ids to be tagged. Null or empty clears tags.
            var tagIds = dto?.Tags;
            post.TaggedUserIds = (tagIds != null && tagIds.Length > 0) ? string.Join(',', tagIds) : null;
            await _postRepository.UpdateAsync(post);

            var updated = await _postRepository.GetByIdWithMediaAsync(id) ?? post;
            var commentsCount = await _commentRepository.GetCommentCountByPostIdAsync(id);
            return Ok(await MapPostToDtoAsync(updated, commentsCount));
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
