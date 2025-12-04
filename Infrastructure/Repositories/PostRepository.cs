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
            var post = await GetByIdAsync(postId);
            if (post != null)
            {
                _context.Posts.Remove(post);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<Post>> GetFeedAsync(int? currentUserId, int pageNumber, int pageSize)
        {
            // Hiển thị: Public cho tất cả; Private chỉ chủ sở hữu; Followers cho chủ sở hữu và follower
            // Chỉ lấy bài của User thường, không lấy Business (Business sẽ được chèn sau)
            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                .Include(p => p.Media)
                .Where(p => p.is_visible &&
                    p.User.Account.account_type == AccountType.User &&
                    (p.privacy.ToLower() == "public"
                        || (currentUserId != null && p.user_id == currentUserId)
                        || (p.privacy.ToLower() == "followers" && currentUserId != null &&
                            _context.Follows.Any(f => f.follower_id == currentUserId && f.following_id == p.user_id))))
                .Where(p => currentUserId == null || !_context.Blocks.Any(b => b.blocker_id == currentUserId && b.blocked_id == p.user_id))
                .OrderByDescending(p => p.created_at)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
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
            // Bài có ít nhất một media là Video
            // Hiển thị: Public cho tất cả; Private chỉ chủ sở hữu; Followers cho chủ sở hữu và follower
            // Chỉ lấy bài của User thường, không lấy Business (Business sẽ được chèn sau)
            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                .Include(p => p.Media)
                .Where(p => p.is_visible
                    && p.User.Account.account_type == AccountType.User
                    && p.Media.Any(m => m.media_type.ToLower() == "video")
                    && (p.privacy.ToLower() == "public"
                        || (currentUserId != null && p.user_id == currentUserId)
                        || (p.privacy.ToLower() == "followers" && currentUserId != null &&
                            _context.Follows.Any(f => f.follower_id == currentUserId && f.following_id == p.user_id))))
                .Where(p => currentUserId == null || !_context.Blocks.Any(b => b.blocker_id == currentUserId && b.blocked_id == p.user_id))
                .OrderByDescending(p => p.created_at)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetAllVideoPostsAsync(int? currentUserId)
        {
            // Bài có ít nhất một media là Video
            // Hiển thị: Public cho tất cả; Private chỉ chủ sở hữu; Followers cho chủ sở hữu và follower
            // Chỉ lấy bài của User thường, không lấy Business (Business sẽ được chèn sau)
            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                .Include(p => p.Media)
                .Where(p => p.is_visible
                    && p.User.Account.account_type == AccountType.User
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
                .Include(p => p.Media)
                .Where(p => p.is_visible 
                    && p.privacy.ToLower() == "public"
                    && p.User.Account.account_type == AccountType.Business)
                .Where(p => currentUserId == null || !_context.Blocks.Any(b => b.blocker_id == currentUserId && b.blocked_id == p.user_id))
                .OrderByDescending(p => p.User.Account.business_verified_at)
                .ThenByDescending(p => p.created_at)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetFollowedBusinessPostsAsync(int currentUserId)
        {
            var followingUserIds = await _context.Follows
                .Where(f => f.follower_id == currentUserId)
                .Select(f => f.following_id)
                .ToListAsync();

            if (!followingUserIds.Any())
                return new List<Post>();

            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                .Include(p => p.Media)
                .Where(p => p.is_visible 
                    && p.privacy.ToLower() == "public"
                    && followingUserIds.Contains(p.user_id)
                    && p.User.Account.account_type == AccountType.Business)
                .OrderByDescending(p => p.created_at)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetRelevantBusinessPostsByKeywordsAsync(List<string> keywords, int? currentUserId, int limit = 50)
        {
            if (keywords == null || !keywords.Any())
                return new List<Post>();

            var query = _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                    .ThenInclude(u => u.Account)
                .Include(p => p.Media)
                .Where(p => p.is_visible 
                    && p.privacy.ToLower() == "public"
                    && p.User.Account.account_type == AccountType.Business);

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


