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
    }
}
