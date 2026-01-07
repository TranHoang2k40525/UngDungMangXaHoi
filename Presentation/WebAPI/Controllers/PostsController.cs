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
using UngDungMangXaHoi.Infrastructure.Services;
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
        private readonly IAdminRepository _adminRepository;
        private readonly IShareRepository _shareRepository;

        private readonly PostsService _postsService;
        private readonly BusinessPostInjectionService _businessPostInjectionService;
        private readonly UserPostPrioritizationService _userPostPrioritizationService;

        private readonly VideoTranscodeService _videoTranscoder;
        private readonly IContentModerationService _moderationService;
        private readonly IContentModerationRepository _moderationRepository;


        public PostsController(
            IPostRepository postRepository,
            IUserRepository userRepository,
            ICommentRepository commentRepository,
            IShareRepository shareRepository,

            Application.Services.PostsService postsService,
            BusinessPostInjectionService businessPostInjectionService,
            UserPostPrioritizationService userPostPrioritizationService,

            VideoTranscodeService videoTranscoder,
            IContentModerationService moderationService,
            IContentModerationRepository moderationRepository,
            IAdminRepository adminRepository)

        {
            _postRepository = postRepository;
            _userRepository = userRepository;
            _commentRepository = commentRepository;
            _shareRepository = shareRepository;

            _adminRepository = adminRepository;

            _postsService = postsService;
            _businessPostInjectionService = businessPostInjectionService;
            _userPostPrioritizationService = userPostPrioritizationService;

            _videoTranscoder = videoTranscoder;
            _moderationService = moderationService;
            _moderationRepository = moderationRepository;

        }

        // Using DTOs from Application.DTOs: CreatePostForm, UpdatePrivacyDto, UpdateCaptionDto, UpdateTagsDto

        [HttpPost]
        [Consumes("multipart/form-data")]
        [RequestFormLimits(MultipartBodyLengthLimit = 150_000_000)] // 150MB total
        [RequestSizeLimit(150_000_000)]
        public async Task<IActionResult> CreatePost(CreatePostForm form)
        {
            var allowedPrivacy = new[] { "public", "private", "followers" };
            var incomingPrivacy = (form.Privacy ?? "public").Trim().ToLowerInvariant();
            if (!allowedPrivacy.Contains(incomingPrivacy))
            {
                return BadRequest(new { message = "privacy phải là public/private/followers" });
            }
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
                Console.WriteLine($"[CreatePost] Video received - FileName: '{video.FileName}', Length: {video.Length}, ContentType: '{video.ContentType}'");

                var allowedVideoExt = new[] { ".mp4", ".mov", ".m4v", ".avi", ".wmv", ".mkv" };
                var vext = Path.GetExtension(video.FileName).ToLowerInvariant();

                Console.WriteLine($"[CreatePost] Video extension extracted: '{vext}'");

                if (!allowedVideoExt.Contains(vext))
                {
                    Console.WriteLine($"[CreatePost] Video extension '{vext}' not in allowed list: {string.Join(", ", allowedVideoExt)}");
                    return BadRequest(new { message = "Định dạng video không hợp lệ." });
                }
            }
            // Parse optional mentions/tags (JSON arrays) and store as CSV on Post
            int[]? mentionIds = null;
            int[]? tagIds = null;
            try
            {
                if (!string.IsNullOrEmpty(form.Mentions))
                {
                    mentionIds = System.Text.Json.JsonSerializer.Deserialize<int[]>(form.Mentions);
                }
            }
            catch { /* ignore parse errors */ }
            try
            {
                if (!string.IsNullOrEmpty(form.Tags))
                {
                    tagIds = System.Text.Json.JsonSerializer.Deserialize<int[]>(form.Tags);
                }
            }
            catch { /* ignore parse errors */ }

            //KIỂM TRA TOXIC CHO CAPTION TRƯỚC KHI TẠO POST
            //  LƯU KẾT QUẢ MODERATION NGAY CẢ KHI CHẶN POST
            ModerationResult? captionModerationResult = null;
            if (!string.IsNullOrWhiteSpace(form.Caption))
            {
                try
                {
                    captionModerationResult = await _moderationService.AnalyzeTextAsync(form.Caption);

                    // LƯU KẾT QUẢ VI PHẠM VÀO DATABASE TRƯỚC KHI CHẶN
                    if (captionModerationResult.RiskLevel == "high_risk")
                    {
                        // Lưu vi phạm vào database (không có PostId vì post chưa được tạo)
                        var violationLog = new ContentModeration
                        {
                            ContentType = "Post", // ContentType = Post, nhưng PostId = null vì bị chặn trước khi tạo
                            ContentID = 0, // Chưa có post ID vì bị chặn
                            AccountId = accountId,
                            PostId = null,
                            CommentId = null,
                            AIConfidence = captionModerationResult.Confidence,
                            ToxicLabel = captionModerationResult.Label,
                            Status = "blocked",
                            CreatedAt = DateTime.UtcNow
                        };
                        
                        try
                        {
                            await _moderationRepository.CreateAsync(violationLog);
                            Console.WriteLine($"[Moderation] Saved blocked post violation for user {accountId}: {captionModerationResult.Label}");
                        }
                        catch (Exception saveEx)
                        {
                            Console.WriteLine($"[Moderation Error] Failed to save blocked post violation: {saveEx.Message}");
                        }

                        // Trả về thông báo chặn
                        return BadRequest(new { message = $"Bài đăng bị chặn do vi phạm: {captionModerationResult.Label}" });
                    }
                }
                catch (Exception ex)
                {
                    // ML Service không khả dụng - log nhưng vẫn cho phép post
                    Console.WriteLine($"[Moderation Warning] ML Service unavailable: {ex.Message}");
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
                created_at = DateTimeOffset.UtcNow,
                MentionedUserIds = (mentionIds != null && mentionIds.Length > 0) ? string.Join(",", mentionIds) : null,
                TaggedUserIds = (tagIds != null && tagIds.Length > 0) ? string.Join(",", tagIds) : null
            };

            var createdPost = await _postRepository.AddAsync(post);

            // LƯU KẾT QUẢ MODERATION VÀO DATABASE (cho post đã được tạo thành công)
            // Chỉ lưu nếu caption có nội dung và đã qua kiểm duyệt (không bị chặn ở bước trước)
            if (!string.IsNullOrWhiteSpace(form.Caption) && captionModerationResult != null)
            {
                try
                {
                    var moderation = new ContentModeration
                    {
                        ContentType = "Post",
                        ContentID = createdPost.post_id,
                        AccountId = accountId,
                        PostId = createdPost.post_id,
                        CommentId = null,
                        AIConfidence = captionModerationResult.Confidence,
                        ToxicLabel = captionModerationResult.Label,
                        Status = captionModerationResult.RiskLevel switch
                        {
                            "medium_risk" => "pending",
                            "low_risk" => "approved",
                            _ => "approved"
                        },
                        CreatedAt = DateTime.UtcNow
                    };
                    await _moderationRepository.CreateAsync(moderation);
                    Console.WriteLine($"[Moderation] Saved moderation result for post {createdPost.post_id}: {captionModerationResult.Label} ({captionModerationResult.RiskLevel})");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Moderation Warning] Failed to save moderation result: {ex.Message}");
                }
            }

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

            // Bước 1: Sắp xếp ưu tiên User posts dựa vào lịch sử tìm kiếm
            var prioritizedUserPosts = await _userPostPrioritizationService.PrioritizeAndMixUserPostsAsync(
                posts.ToList(),
                currentUserId);

            // Bước 2: Chèn bài Business vào feed đã được prioritize
            var mergedFeed = await _businessPostInjectionService.InjectBusinessPostsIntoFeedAsync(
                prioritizedUserPosts,
                currentUserId);

            // Load comment counts for all posts in single query
            var postIds = mergedFeed.Select(p => p.post_id).ToList();
            var commentCounts = await _commentRepository.GetCommentCountsByPostIdsAsync(postIds);

            // Load share counts for all posts
            var shareCounts = new Dictionary<int, int>();
            foreach (var postId in postIds)
            {
                shareCounts[postId] = await _shareRepository.GetShareCountByPostIdAsync(postId);
            }

            var dtoList = new List<object>();
            foreach (var pp in mergedFeed)
            {
                dtoList.Add(await MapPostToDtoAsync(pp, commentCounts.GetValueOrDefault(pp.post_id, 0), shareCounts.GetValueOrDefault(pp.post_id, 0)));
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

            // Bước 2: Chèn Business VIDEO vào reels (CHỈ VIDEO, không chèn ảnh)
            // Sử dụng InjectBusinessVideoPostsAsync thay vì InjectBusinessPostsIntoFeedAsync
            var mergedReels = await _businessPostInjectionService.InjectBusinessVideoPostsIntoReelsAsync(
                prioritizedUserPosts,
                currentUserId);

            // Load comment counts in single query
            var postIds = mergedReels.Select(p => p.post_id).ToList();
            var commentCounts = await _commentRepository.GetCommentCountsByPostIdsAsync(postIds);

            // Load share counts for all posts
            var shareCounts = new Dictionary<int, int>();
            foreach (var postId in postIds)
            {
                shareCounts[postId] = await _shareRepository.GetShareCountByPostIdAsync(postId);
            }

            var dtoList2 = new List<object>();
            foreach (var pp in mergedReels)
            {
                dtoList2.Add(await MapPostToDtoAsync(pp, commentCounts.GetValueOrDefault(pp.post_id, 0), shareCounts.GetValueOrDefault(pp.post_id, 0)));
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

            // Bước 2: Chèn Business VIDEO vào all reels (CHỈ VIDEO)
            var mergedReels = await _businessPostInjectionService.InjectBusinessVideoPostsIntoReelsAsync(
                prioritizedUserPosts,
                currentUserId);

            // Load comment counts in single query
            var postIds = mergedReels.Select(p => p.post_id).ToList();
            var commentCounts = await _commentRepository.GetCommentCountsByPostIdsAsync(postIds);

            // Load share counts for all posts
            var shareCounts = new Dictionary<int, int>();
            foreach (var postId in postIds)
            {
                shareCounts[postId] = await _shareRepository.GetShareCountByPostIdAsync(postId);
            }

            var dtoList3 = new List<object>();
            foreach (var pp in mergedReels)
            {
                dtoList3.Add(await MapPostToDtoAsync(pp, commentCounts.GetValueOrDefault(pp.post_id, 0), shareCounts.GetValueOrDefault(pp.post_id, 0)));
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

            // Load comment counts in single query
            var postIds = posts.Select(p => p.post_id).ToList();
            var commentCounts = await _commentRepository.GetCommentCountsByPostIdsAsync(postIds);

            // Load share counts
            var shareCounts = new Dictionary<int, int>();
            foreach (var postId in postIds)
            {
                shareCounts[postId] = await _shareRepository.GetShareCountByPostIdAsync(postId);
            }

            var dtoList4 = new List<object>();
            foreach (var pp in posts)
            {
                dtoList4.Add(await MapPostToDtoAsync(pp, commentCounts.GetValueOrDefault(pp.post_id, 0), shareCounts.GetValueOrDefault(pp.post_id, 0)));
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

            // Load comment counts in single query
            var postIds = posts.Select(p => p.post_id).ToList();
            var commentCounts = await _commentRepository.GetCommentCountsByPostIdsAsync(postIds);

            // Load share counts
            var shareCounts = new Dictionary<int, int>();
            foreach (var postId in postIds)
            {
                shareCounts[postId] = await _shareRepository.GetShareCountByPostIdAsync(postId);
            }

            var dtoList5 = new List<object>();
            foreach (var pp in posts)
            {
                dtoList5.Add(await MapPostToDtoAsync(pp, commentCounts.GetValueOrDefault(pp.post_id, 0), shareCounts.GetValueOrDefault(pp.post_id, 0)));
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

                // Kiểm tra quyền xem post: cho phép owner hoặc admin xem private post
                var isAdmin = false;
                try
                {
                    var accountIdStr2 = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    if (!string.IsNullOrEmpty(accountIdStr2) && int.TryParse(accountIdStr2, out var accountId2))
                    {
                        var admin = await _adminRepository.GetByAccountIdAsync(accountId2);
                        if (admin != null) isAdmin = true;
                    }
                }
                catch { }

                if (post.privacy == "private" && currentUserId != post.user_id && !isAdmin)
                {
                    return Forbid();
                }

                // Load comment count
                var commentsCount = await _commentRepository.GetCommentCountByPostIdAsync(id);

                // Load share count
                var sharesCount = await _shareRepository.GetShareCountByPostIdAsync(id);

                var postDto = await MapPostToDtoAsync(post, commentsCount, sharesCount);
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

            // Load comment counts in single query
            var postIds = posts.Select(p => p.post_id).ToList();
            var commentCounts = await _commentRepository.GetCommentCountsByPostIdsAsync(postIds);

            // Load share counts
            var shareCounts = new Dictionary<int, int>();
            foreach (var postId in postIds)
            {
                shareCounts[postId] = await _shareRepository.GetShareCountByPostIdAsync(postId);
            }

            var dtoList6 = new List<object>();
            foreach (var pp in posts)
            {
                dtoList6.Add(await MapPostToDtoAsync(pp, commentCounts.GetValueOrDefault(pp.post_id, 0), shareCounts.GetValueOrDefault(pp.post_id, 0)));
            }
            return Ok(dtoList6);
        }



        private async Task<object> MapPostToDtoAsync(Post p, int commentsCount = 0, int sharesCount = 0)
        {
            // Resolve asset/url to a safe relative or pass-through absolute URL.
            string ResolveAssetUrl(string raw)
            {
                if (string.IsNullOrEmpty(raw)) return raw;
                // If already absolute, return as-is
                if (raw.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || raw.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    return raw;
                // If already a root-relative path, return as-is
                if (raw.StartsWith("/"))
                    return raw;
                // If contains Assets/ prefix, ensure leading slash
                if (raw.IndexOf("Assets/", StringComparison.OrdinalIgnoreCase) >= 0)
                    return "/" + raw.TrimStart('/');
                // Otherwise treat as filename under Images by default
                return $"/Assets/Images/{raw}";
            }

            var media = p.Media
                .OrderBy(m => m.media_order)
                .Select(m =>
                {
                    string type = m.media_type;
                    string url;
                    string? altUrl = null;

                    if (type.Equals("video", StringComparison.OrdinalIgnoreCase))
                    {
                        url = ResolveAssetUrl($"/Assets/Videos/{m.media_url}");
                        try
                        {
                            var root = Directory.GetCurrentDirectory();
                            var videosDir = Path.Combine(root, "Assets", "Videos");
                            var nameNoExt = Path.GetFileNameWithoutExtension(m.media_url);
                            var compatName = nameNoExt + "_compat.mp4";
                            var compatPath = Path.Combine(videosDir, compatName);
                            if (System.IO.File.Exists(compatPath))
                            {
                                altUrl = ResolveAssetUrl($"/Assets/Videos/{compatName}");
                            }
                        }
                        catch { }
                    }
                    else
                    {
                        url = ResolveAssetUrl($"/Assets/Images/{m.media_url}");
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
                            mentions.AddRange(users.Select(u => new
                        {
                            id = u.user_id,
                            username = u.username.Value,
                            avatarUrl = u.avatar_url?.Value != null ? ResolveAssetUrl(u.avatar_url.Value) : null
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
                        tags.AddRange(users.Select(u => new
                        {
                            id = u.user_id,
                            username = u.username.Value,
                            avatarUrl = u.avatar_url?.Value != null ? ResolveAssetUrl(u.avatar_url.Value) : null
                        }));
                    }
                }
            }
            catch { }
            // Check if user has Business role (RBAC)
            bool hasBusinessRole = p.User?.Account?.AccountRoles
                .Any(ar => ar.is_active && ar.Role.role_name == "Business") ?? false;
            bool isSponsored = hasBusinessRole;

            return new
            {
                id = p.post_id,
                caption = p.caption,
                location = p.location,
                privacy = p.privacy,
                createdAt = p.created_at,
                commentsCount = commentsCount,
                sharesCount = sharesCount,
                isSponsored = isSponsored,

                user = new
                {
                    id = p.User?.user_id,
                    username = p.User?.username.Value,
                    avatarUrl = p.User?.avatar_url?.Value != null ? ResolveAssetUrl(p.User.avatar_url.Value) : null,
                    // ✅ Get account type from RBAC roles
                    accountType = p.User?.Account?.AccountRoles
                        .Where(ar => ar.is_active)
                        .OrderByDescending(ar => ar.Role.priority)
                        .Select(ar => ar.Role.role_name)
                        .FirstOrDefault()
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
            var sharesCount = await _shareRepository.GetShareCountByPostIdAsync(id);
            return Ok(await MapPostToDtoAsync(updated, commentsCount, sharesCount));
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

            // KIỂM TRA TOXIC KHI SỬA CAPTION VÀ LƯU KẾT QUẢ NGAY CẢ KHI CHẶN
            if (!string.IsNullOrWhiteSpace(caption))
            {
                try
                {
                    var moderationResult = await _moderationService.AnalyzeTextAsync(caption);

                    // LƯU KẾT QUẢ VI PHẠM TRƯỚC KHI CHẶN
                    if (moderationResult.RiskLevel == "high_risk")
                    {
                        // Lưu vi phạm vào database
                        var violationLog = new ContentModeration
                        {
                            ContentType = "Post_Caption_Update_Blocked",
                            ContentID = id,
                            AccountId = accountId,
                            PostId = id,
                            CommentId = null,
                            AIConfidence = moderationResult.Confidence,
                            ToxicLabel = moderationResult.Label,
                            Status = "blocked",
                            CreatedAt = DateTime.UtcNow
                        };
                        
                        try
                        {
                            await _moderationRepository.CreateAsync(violationLog);
                            Console.WriteLine($"[Moderation] Saved blocked caption update for post {id}: {moderationResult.Label}");
                        }
                        catch (Exception saveEx)
                        {
                            Console.WriteLine($"[Moderation Error] Failed to save violation: {saveEx.Message}");
                        }

                        return BadRequest(new { message = $"Caption bị chặn do vi phạm: {moderationResult.Label}" });
                    }

                    // ưu kết quả moderation cho caption hợp lệ (medium_risk hoặc low_risk)
                    var moderation = new ContentModeration
                    {
                        ContentType = "Post_Caption_Update",
                        ContentID = id,
                        AccountId = accountId,
                        PostId = id,
                        CommentId = null,
                        AIConfidence = moderationResult.Confidence,
                        ToxicLabel = moderationResult.Label,
                        Status = moderationResult.RiskLevel switch
                        {
                            "medium_risk" => "pending",
                            "low_risk" => "approved",
                            _ => "approved"
                        },
                        CreatedAt = DateTime.UtcNow
                    };
                    await _moderationRepository.CreateAsync(moderation);
                    Console.WriteLine($"[Moderation] Saved caption update moderation for post {id}: {moderationResult.Label}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Moderation Warning] ML Service unavailable: {ex.Message}");
                }
            }

            post.caption = caption;
            await _postRepository.UpdateAsync(post);

            var updated = await _postRepository.GetByIdWithMediaAsync(id) ?? post;
            var commentsCount = await _commentRepository.GetCommentCountByPostIdAsync(id);
            var sharesCount = await _shareRepository.GetShareCountByPostIdAsync(id);
            return Ok(await MapPostToDtoAsync(updated, commentsCount, sharesCount));
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
            var sharesCount = await _shareRepository.GetShareCountByPostIdAsync(id);
            return Ok(await MapPostToDtoAsync(updated, commentsCount, sharesCount));
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