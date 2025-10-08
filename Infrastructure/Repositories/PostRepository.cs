using System;
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

        public async Task<Post?> GetByIdAsync(Guid id)
        {
            return await _context.Posts
                .Include(p => p.Author)
                .Include(p => p.Comments)
                .Include(p => p.Likes)
                .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        }

        public async Task<IEnumerable<Post>> GetByAuthorIdAsync(Guid authorId, int pageNumber, int pageSize)
        {
            return await _context.Posts
                .Include(p => p.Author)
                .Where(p => p.AuthorId == authorId && !p.IsDeleted)
                .OrderByDescending(p => p.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetFeedAsync(Guid userId, int pageNumber, int pageSize)
        {
            // Get user's friends
            var friendIds = await _context.Friendships
                .Where(f => (f.RequesterId == userId || f.AddresseeId == userId) && 
                           f.Status == FriendshipStatus.Accepted)
                .Select(f => f.RequesterId == userId ? f.AddresseeId : f.RequesterId)
                .ToListAsync();

            // Include user's own posts
            friendIds.Add(userId);

            return await _context.Posts
                .Include(p => p.Author)
                .Where(p => friendIds.Contains(p.AuthorId) && !p.IsDeleted)
                .OrderByDescending(p => p.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Post>> GetAllAsync(int pageNumber, int pageSize)
        {
            return await _context.Posts
                .Include(p => p.Author)
                .Where(p => !p.IsDeleted)
                .OrderByDescending(p => p.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<Post> AddAsync(Post post)
        {
            _context.Posts.Add(post);
            await _context.SaveChangesAsync();
            return post;
        }

        public async Task UpdateAsync(Post post)
        {
            _context.Posts.Update(post);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var post = await _context.Posts.FindAsync(id);
            if (post != null)
            {
                post.Delete();
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> ExistsAsync(Guid id)
        {
            return await _context.Posts.AnyAsync(p => p.Id == id && !p.IsDeleted);
        }

        public async Task<bool> IsAuthorAsync(Guid postId, Guid userId)
        {
            return await _context.Posts.AnyAsync(p => p.Id == postId && p.AuthorId == userId);
        }

        public async Task<int> GetTotalPostsCountAsync()
        {
            return await _context.Posts.CountAsync(p => !p.IsDeleted);
        }

        public async Task<int> GetPostsCountByAuthorAsync(Guid authorId)
        {
            return await _context.Posts.CountAsync(p => p.AuthorId == authorId && !p.IsDeleted);
        }
    }
}

