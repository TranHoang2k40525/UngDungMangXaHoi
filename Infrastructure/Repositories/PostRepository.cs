using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class PostRepository : IPostRepository
    {
        private readonly AppDbContext _context;

        public PostRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Post> AddAsync(Post post)
        {
            post.created_at = System.DateTimeOffset.UtcNow;
            _context.Posts.Add(post);
            await _context.SaveChangesAsync();
            return post;
        }

        public async Task<PostMedia> AddMediaAsync(PostMedia media)
        {
            media.created_at = System.DateTimeOffset.UtcNow;
            _context.PostMedia.Add(media);
            await _context.SaveChangesAsync();
            return media;
        }

        public async Task<Post?> GetByIdAsync(int postId)
        {
            return await _context.Posts
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.post_id == postId);
        }

        public async Task<Post?> GetByIdWithMediaAsync(int postId)
        {
            return await _context.Posts
                .Include(p => p.User)
                .Include(p => p.Media)
                .FirstOrDefaultAsync(p => p.post_id == postId);
        }

        public async Task UpdateAsync(Post post)
        {
            _context.Posts.Update(post);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int postId)
        {
            var post = await _context.Posts
                .Include(p => p.Media)
                .Include(p => p.Comments)
                    .ThenInclude(c => c.Reactions)
                .Include(p => p.Comments)
                    .ThenInclude(c => c.Mentions)
                .FirstOrDefaultAsync(p => p.post_id == postId);
            
            if (post == null) return;

            // Step 1: Delete all comment-related data first (to avoid FK constraint violations)
            if (post.Comments != null && post.Comments.Any())
            {
                foreach (var comment in post.Comments.ToList())
                {
                    // Delete comment reactions
                    if (comment.Reactions != null && comment.Reactions.Any())
                    {
                        _context.CommentReactions.RemoveRange(comment.Reactions);
                    }
                    
                    // Delete comment mentions
                    if (comment.Mentions != null && comment.Mentions.Any())
                    {
                        _context.CommentMentions.RemoveRange(comment.Mentions);
                    }
                    
                    // ✅ Delete ContentModeration records that reference this comment
                    var commentModerations = await _context.ContentModerations
                        .Where(cm => cm.CommentId == comment.CommentId)
                        .ToListAsync();
                    if (commentModerations.Any())
                    {
                        _context.ContentModerations.RemoveRange(commentModerations);
                    }
                    
                    // Delete the comment itself
                    _context.Comments.Remove(comment);
                }
            }

            // Step 2: Delete post media records (database records)
            if (post.Media != null && post.Media.Any())
            {
                _context.PostMedia.RemoveRange(post.Media);
            }

            // Step 3: Delete ContentModeration records related to this post
            // ✅ Cannot set PostId to null because CHECK constraint requires at least one FK non-null
            var moderations = await _context.ContentModerations
                .Where(cm => cm.PostId == postId)
                .ToListAsync();
            if (moderations.Any())
            {
                _context.ContentModerations.RemoveRange(moderations);
            }

            // Step 4: Finally delete the post
            _context.Posts.Remove(post);
            
            // Save all changes
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Post>> GetFeedAsync(int? currentUserId, int pageNumber, int pageSize)
        {
            // CHỈ lấy bài posts của User (account_type == User)
            // Business posts sẽ được inject riêng bởi BusinessPostInjectionService
            // Hiển thị: Public cho tất cả; Private chỉ chủ sở hữu; Followers cho chủ sở hữu và follower
            
            var query = _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                        .ThenInclude(a => a.AccountRoles)
                            .ThenInclude(ar => ar.Role)
                .Include(p => p.Media)
                .Where(p => p.is_visible &&
                    // CHỈ lấy User posts (RBAC User role)
                    p.User.Account.AccountRoles.Any(ar => ar.is_active && ar.Role.role_name == "User") &&
                    (p.privacy.ToLower() == "public"
                        || (currentUserId != null && p.user_id == currentUserId)
                        || (p.privacy.ToLower() == "followers" && currentUserId != null &&
                            _context.Follows.Any(f => f.follower_id == currentUserId && f.following_id == p.user_id))))
                .Where(p => currentUserId == null || !_context.Blocks.Any(b => b.blocker_id == currentUserId && b.blocked_id == p.user_id))
                .OrderByDescending(p => p.created_at);
            
            // Tính tổng số posts
            var totalPosts = await query.CountAsync();
            
            if (totalPosts == 0)
                return new List<Post>();
            
            // Circular pagination: Nếu page vượt quá tổng số posts, lặp lại từ đầu
            var skip = ((pageNumber - 1) * pageSize) % totalPosts;
            var take = pageSize;
            
            // Nếu take vượt quá số posts còn lại, lấy thêm từ đầu
            var firstBatch = await query.Skip(skip).Take(take).ToListAsync();
            
            if (firstBatch.Count < take && totalPosts > firstBatch.Count)
            {
                // Lấy thêm posts từ đầu để đủ pageSize
                var remaining = take - firstBatch.Count;
                var secondBatch = await query.Take(remaining).ToListAsync();
                firstBatch.AddRange(secondBatch);
            }
            
            return firstBatch;
        }

        public async Task<IEnumerable<Post>> GetUserPostsAsync(int userId, int pageNumber, int pageSize)
        {
            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                .Include(p => p.Media)
                .Where(p => p.is_visible && p.user_id == userId)
                .OrderByDescending(p => p.created_at)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetUserPostsForViewerAsync(int userId, int? viewerUserId, int pageNumber, int pageSize)
        {
            // If the viewer is the owner, return all visible posts
            if (viewerUserId != null && viewerUserId.Value == userId)
            {
                // But if owner has blocked viewer (shouldn't happen when same user), still return
                return await GetUserPostsAsync(userId, pageNumber, pageSize);
            }

            // If the target user has blocked the viewer, return empty (viewer cannot see this user's profile)
            if (viewerUserId != null && _context.Blocks.Any(b => b.blocker_id == userId && b.blocked_id == viewerUserId))
            {
                return new List<Post>();
            }

            // Otherwise, return public posts + followers-only if viewer follows user
            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                .Include(p => p.Media)
                .Where(p => p.is_visible && p.user_id == userId && (
                    p.privacy.ToLower() == "public"
                    || (p.privacy.ToLower() == "followers" && viewerUserId != null &&
                        _context.Follows.Any(f => f.follower_id == viewerUserId && f.following_id == userId))
                ))
                // Exclude if viewer has blocked this user (then viewer shouldn't see their posts)
                .Where(p => viewerUserId == null || !_context.Blocks.Any(b => b.blocker_id == viewerUserId && b.blocked_id == p.user_id))
                .OrderByDescending(p => p.created_at)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetVideoPostsAsync(int? currentUserId, int pageNumber, int pageSize)
        {
            // CHỈ lấy video posts của User (account_type == User)
            // Business video posts sẽ được inject riêng bởi BusinessPostInjectionService
            // Bài có ít nhất một media là Video
            // Hiển thị: Public cho tất cả; Private chỉ chủ sở hữu; Followers cho chủ sở hữu và follower
            
            var query = _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                        .ThenInclude(a => a.AccountRoles)
                            .ThenInclude(ar => ar.Role)
                .Include(p => p.Media)
                .Where(p => p.is_visible
                    // CHỈ lấy User video posts (RBAC User role)
                    && p.User.Account.AccountRoles.Any(ar => ar.is_active && ar.Role.role_name == "User")
                    && p.Media.Any(m => m.media_type.ToLower() == "video")
                    && (p.privacy.ToLower() == "public"
                        || (currentUserId != null && p.user_id == currentUserId)
                        || (p.privacy.ToLower() == "followers" && currentUserId != null &&
                            _context.Follows.Any(f => f.follower_id == currentUserId && f.following_id == p.user_id))))
                .Where(p => currentUserId == null || !_context.Blocks.Any(b => b.blocker_id == currentUserId && b.blocked_id == p.user_id))
                .OrderByDescending(p => p.created_at);
            
            // Tính tổng số video posts
            var totalPosts = await query.CountAsync();
            
            if (totalPosts == 0)
                return new List<Post>();
            
            // Circular pagination: Nếu page vượt quá tổng số posts, lặp lại từ đầu
            var skip = ((pageNumber - 1) * pageSize) % totalPosts;
            var take = pageSize;
            
            // Nếu take vượt quá số posts còn lại, lấy thêm từ đầu
            var firstBatch = await query.Skip(skip).Take(take).ToListAsync();
            
            if (firstBatch.Count < take && totalPosts > firstBatch.Count)
            {
                // Lấy thêm posts từ đầu để đủ pageSize
                var remaining = take - firstBatch.Count;
                var secondBatch = await query.Take(remaining).ToListAsync();
                firstBatch.AddRange(secondBatch);
            }
            
            return firstBatch;
        }

        public async Task<IEnumerable<Post>> GetAllVideoPostsAsync(int? currentUserId)
        {
            // CHỈ lấy tất cả video posts của User (account_type == User)
            // Business video posts sẽ được inject riêng bởi BusinessPostInjectionService
            // Bài có ít nhất một media là Video
            // Hiển thị: Public cho tất cả; Private chỉ chủ sở hữu; Followers cho chủ sở hữu và follower
            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                        .ThenInclude(a => a.AccountRoles)
                            .ThenInclude(ar => ar.Role)
                .Include(p => p.Media)
                .Where(p => p.is_visible
                    // CHỈ lấy User video posts (RBAC User role)
                    && p.User.Account.AccountRoles.Any(ar => ar.is_active && ar.Role.role_name == "User")
                    && p.Media.Any(m => m.media_type.ToLower() == "video")
                    && (p.privacy.ToLower() == "public"
                        || (currentUserId != null && p.user_id == currentUserId)
                        || (p.privacy.ToLower() == "followers" && currentUserId != null &&
                            _context.Follows.Any(f => f.follower_id == currentUserId && f.following_id == p.user_id))))
                .Where(p => currentUserId == null || !_context.Blocks.Any(b => b.blocker_id == currentUserId && b.blocked_id == p.user_id))
                .OrderByDescending(p => p.created_at)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetFollowingVideoPostsAsync(int currentUserId, int pageNumber, int pageSize)
        {
            // Lấy video posts từ những người mà currentUser đang follow
            // Lấy danh sách user_id mà currentUser đang follow
            var followingUserIds = await _context.Follows
                .Where(f => f.follower_id == currentUserId)
                .Select(f => f.following_id)
                .ToListAsync();

            if (!followingUserIds.Any())
            {
                return new List<Post>(); // Không follow ai, trả về rỗng
            }

            // Lấy video posts từ những người đang follow
            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                .Include(p => p.Media)
                .Where(p => p.is_visible
                    && followingUserIds.Contains(p.user_id) // Chỉ lấy từ người đang follow
                    && p.Media.Any(m => m.media_type.ToLower() == "video")
                    && (
                        p.privacy.ToLower() == "public"
                        || p.privacy.ToLower() == "followers" // Vì đã follow nên được xem
                    ))
                .OrderByDescending(p => p.created_at)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> GetUserPostCountAsync(int userId)
        {
            return await _context.Posts.CountAsync(p => p.is_visible && p.user_id == userId);
        }        public async Task<int> CountPostsByUserIdAsync(int userId)
        {
            return await _context.Posts.CountAsync(p => p.is_visible && p.user_id == userId);
        }        public async Task<IEnumerable<Post>> SearchPostsByCaptionAsync(string searchTerm, int pageNumber, int pageSize)
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                return new List<Post>();
            }

            searchTerm = searchTerm.ToLower();

            // Search posts có caption CHỨA searchTerm ở BẤT KỲ ĐÂU (case-insensitive)
            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                .Include(p => p.Media)
                .Where(p => p.is_visible 
                    && p.privacy.ToLower() == "public"
                    && p.caption != null
                    && p.caption.ToLower().Contains(searchTerm))
                .OrderByDescending(p => p.created_at)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetPublicBusinessPostsAsync(int? currentUserId)
        {
            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                        .ThenInclude(a => a.AccountRoles)
                            .ThenInclude(ar => ar.Role)
                .Include(p => p.Media)
                .Where(p => p.is_visible 
                    && p.privacy.ToLower() == "public"
                    && p.User.Account.AccountRoles.Any(ar => ar.is_active && ar.Role.role_name == "Business"))
                .Where(p => currentUserId == null || !_context.Blocks.Any(b => b.blocker_id == currentUserId && b.blocked_id == p.user_id))
                .OrderByDescending(p => p.User.Account.business_verified_at)
                .ThenByDescending(p => p.created_at)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetPublicBusinessVideoPostsAsync(int? currentUserId)
        {
            // CHỈ lấy Business VIDEO posts (có ít nhất 1 media là video)
            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                        .ThenInclude(a => a.AccountRoles)
                            .ThenInclude(ar => ar.Role)
                .Include(p => p.Media)
                .Where(p => p.is_visible 
                    && p.privacy.ToLower() == "public"
                    && p.User.Account.AccountRoles.Any(ar => ar.is_active && ar.Role.role_name == "Business")
                    && p.Media.Any(m => m.media_type.ToLower() == "video")) // CHỈ VIDEO
                .Where(p => currentUserId == null || !_context.Blocks.Any(b => b.blocker_id == currentUserId && b.blocked_id == p.user_id))
                .OrderByDescending(p => p.User.Account.business_verified_at)
                .ThenByDescending(p => p.created_at)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetFollowedBusinessPostsAsync(int currentUserId)
        {
            // CHỈ lấy 1 BÀI MỚI NHẤT từ mỗi Business account mà user đang follow
            // Follow chỉ là ưu tiên, không giới hạn toàn bộ quảng cáo
            var followingUserIds = await _context.Follows
                .Where(f => f.follower_id == currentUserId)
                .Select(f => f.following_id)
                .ToListAsync();

            if (!followingUserIds.Any())
                return new List<Post>();

            // Bước 1: Lấy post_id của bài mới nhất từ mỗi Business account (không Include)
            var latestPostIds = await _context.Posts
                .AsNoTracking()
                .Where(p => p.is_visible 
                    && p.privacy.ToLower() == "public"
                    && followingUserIds.Contains(p.user_id)
                    && p.User.Account.AccountRoles.Any(ar => ar.is_active && ar.Role.role_name == "Business"))
                .GroupBy(p => p.user_id)
                .Select(g => g.OrderByDescending(p => p.created_at).Select(p => p.post_id).FirstOrDefault())
                .ToListAsync();

            // Bước 2: Load posts với Include dựa trên post_id
            var latestPostsPerBusiness = await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                        .ThenInclude(a => a.AccountRoles)
                            .ThenInclude(ar => ar.Role)
                .Include(p => p.Media)
                .Where(p => latestPostIds.Contains(p.post_id))
                .OrderByDescending(p => p.created_at)
                .ToListAsync();

            return latestPostsPerBusiness;
        }

        public async Task<IEnumerable<Post>> GetFollowedBusinessVideoPostsAsync(int currentUserId)
        {
            // CHỈ lấy 1 VIDEO MỚI NHẤT từ mỗi Business account mà user đang follow
            // Follow chỉ là ưu tiên, không giới hạn toàn bộ quảng cáo video
            var followingUserIds = await _context.Follows
                .Where(f => f.follower_id == currentUserId)
                .Select(f => f.following_id)
                .ToListAsync();

            if (!followingUserIds.Any())
                return new List<Post>();

            // Bước 1: Lấy post_id của video mới nhất từ mỗi Business account (không Include)
            var latestVideoIds = await _context.Posts
                .AsNoTracking()
                .Where(p => p.is_visible 
                    && p.privacy.ToLower() == "public"
                    && followingUserIds.Contains(p.user_id)
                    && p.User.Account.AccountRoles.Any(ar => ar.is_active && ar.Role.role_name == "Business")
                    && p.Media.Any(m => m.media_type.ToLower() == "video")) // CHỈ VIDEO
                .GroupBy(p => p.user_id)
                .Select(g => g.OrderByDescending(p => p.created_at).Select(p => p.post_id).FirstOrDefault())
                .ToListAsync();

            // Bước 2: Load posts với Include dựa trên post_id
            var latestVideosPerBusiness = await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                        .ThenInclude(a => a.AccountRoles)
                            .ThenInclude(ar => ar.Role)
                .Include(p => p.Media)
                .Where(p => latestVideoIds.Contains(p.post_id))
                .OrderByDescending(p => p.created_at)
                .ToListAsync();

            return latestVideosPerBusiness;
        }

        public async Task<IEnumerable<Post>> GetRelevantBusinessPostsByKeywordsAsync(List<string> keywords, int? currentUserId, int limit = 50)
        {
            if (keywords == null || !keywords.Any())
                return new List<Post>();

            var query = _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                        .ThenInclude(a => a.AccountRoles)
                            .ThenInclude(ar => ar.Role)
                .Include(p => p.Media)
                .Where(p => p.is_visible 
                    && p.privacy.ToLower() == "public"
                    && p.User.Account.AccountRoles.Any(ar => ar.is_active && ar.Role.role_name == "Business"));

            // Filter by keywords in caption
            var lowerKeywords = keywords.Select(k => k.ToLower()).ToList();
            query = query.Where(p => p.caption != null && 
                lowerKeywords.Any(k => p.caption.ToLower().Contains(k)));

            if (currentUserId != null)
            {
                query = query.Where(p => !_context.Blocks.Any(b => b.blocker_id == currentUserId && b.blocked_id == p.user_id));
            }

            return await query
                .OrderByDescending(p => p.created_at)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetRelevantBusinessVideoPostsByKeywordsAsync(List<string> keywords, int? currentUserId, int limit = 50)
        {
            // CHỈ lấy Business VIDEO posts theo keywords
            if (keywords == null || !keywords.Any())
                return new List<Post>();

            var query = _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                        .ThenInclude(a => a.AccountRoles)
                            .ThenInclude(ar => ar.Role)
                .Include(p => p.Media)
                .Where(p => p.is_visible 
                    && p.privacy.ToLower() == "public"
                    && p.User.Account.AccountRoles.Any(ar => ar.is_active && ar.Role.role_name == "Business")
                    && p.Media.Any(m => m.media_type.ToLower() == "video")); // CHỈ VIDEO

            // Filter by keywords in caption
            var lowerKeywords = keywords.Select(k => k.ToLower()).ToList();
            query = query.Where(p => p.caption != null && 
                lowerKeywords.Any(k => p.caption.ToLower().Contains(k)));

            if (currentUserId != null)
            {
                query = query.Where(p => !_context.Blocks.Any(b => b.blocker_id == currentUserId && b.blocked_id == p.user_id));
            }

            return await query
                .OrderByDescending(p => p.created_at)
                .Take(limit)
                .ToListAsync();
        }
    }
}


