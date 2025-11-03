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
            var query = _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                .Include(p => p.Media)
                .Where(p => p.is_visible && (
                    p.privacy.ToLower() == "public"
                    || (currentUserId != null && p.user_id == currentUserId)
                    || (p.privacy.ToLower() == "followers" && currentUserId != null &&
                        _context.Follows.Any(f => f.follower_id == currentUserId && f.following_id == p.user_id))
                ))
                .OrderByDescending(p => p.created_at)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize);

            return await query.ToListAsync();
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
                return await GetUserPostsAsync(userId, pageNumber, pageSize);
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
                .OrderByDescending(p => p.created_at)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetVideoPostsAsync(int? currentUserId, int pageNumber, int pageSize)
        {
            // Bài có ít nhất một media là Video
            // Hiển thị: Public cho tất cả; Private chỉ chủ sở hữu; Followers cho chủ sở hữu và follower
            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                .Include(p => p.Media)
                .Where(p => p.is_visible
                    && p.Media.Any(m => m.media_type.ToLower() == "video")
                    && (
                        p.privacy.ToLower() == "public"
                        || (currentUserId != null && p.user_id == currentUserId)
                        || (p.privacy.ToLower() == "followers" && currentUserId != null &&
                            _context.Follows.Any(f => f.follower_id == currentUserId && f.following_id == p.user_id))
                    ))
                .OrderByDescending(p => p.created_at)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetAllVideoPostsAsync(int? currentUserId)
        {
            // Bài có ít nhất một media là Video
            // Hiển thị: Public cho tất cả; Private chỉ chủ sở hữu; Followers cho chủ sở hữu và follower
            return await _context.Posts
                .AsNoTracking()
                .Include(p => p.User)
                .Include(p => p.Media)
                .Where(p => p.is_visible
                    && p.Media.Any(m => m.media_type.ToLower() == "video")
                    && (
                        p.privacy.ToLower() == "public"
                        || (currentUserId != null && p.user_id == currentUserId)
                        || (p.privacy.ToLower() == "followers" && currentUserId != null &&
                            _context.Follows.Any(f => f.follower_id == currentUserId && f.following_id == p.user_id))
                    ))
                .OrderByDescending(p => p.created_at)
                .ToListAsync();
        }

        public async Task<int> GetUserPostCountAsync(int userId)
        {
            return await _context.Posts.CountAsync(p => p.is_visible && p.user_id == userId);
        }

        public async Task<int> CountPostsByUserIdAsync(int userId)
        {
            return await _context.Posts.CountAsync(p => p.is_visible && p.user_id == userId);
        }
    }
}
