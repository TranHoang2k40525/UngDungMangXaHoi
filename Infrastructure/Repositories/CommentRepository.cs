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
    public class CommentRepository : ICommentRepository
    {
        private readonly AppDbContext _context;

        public CommentRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Comment?> GetByIdAsync(Guid id)
        {
            return await _context.Comments
                .Include(c => c.Author)
                .Include(c => c.Post)
                .Include(c => c.ParentComment)
                .Include(c => c.Replies)
                .Include(c => c.Likes)
                .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
        }

        public async Task<IEnumerable<Comment>> GetByPostIdAsync(Guid postId, int pageNumber, int pageSize)
        {
            return await _context.Comments
                .Include(c => c.Author)
                .Include(c => c.Replies)
                .Where(c => c.PostId == postId && !c.IsDeleted && c.ParentCommentId == null)
                .OrderByDescending(c => c.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Comment>> GetByAuthorIdAsync(Guid authorId, int pageNumber, int pageSize)
        {
            return await _context.Comments
                .Include(c => c.Author)
                .Include(c => c.Post)
                .Where(c => c.AuthorId == authorId && !c.IsDeleted)
                .OrderByDescending(c => c.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Comment>> GetRepliesAsync(Guid parentCommentId, int pageNumber, int pageSize)
        {
            return await _context.Comments
                .Include(c => c.Author)
                .Where(c => c.ParentCommentId == parentCommentId && !c.IsDeleted)
                .OrderBy(c => c.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<Comment> AddAsync(Comment comment)
        {
            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();
            return comment;
        }

        public async Task UpdateAsync(Comment comment)
        {
            _context.Comments.Update(comment);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var comment = await _context.Comments.FindAsync(id);
            if (comment != null)
            {
                comment.Delete();
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> ExistsAsync(Guid id)
        {
            return await _context.Comments.AnyAsync(c => c.Id == id && !c.IsDeleted);
        }

        public async Task<bool> IsAuthorAsync(Guid commentId, Guid userId)
        {
            return await _context.Comments.AnyAsync(c => c.Id == commentId && c.AuthorId == userId);
        }

        public async Task<int> GetTotalCommentsCountAsync()
        {
            return await _context.Comments.CountAsync(c => !c.IsDeleted);
        }

        public async Task<int> GetCommentsCountByPostAsync(Guid postId)
        {
            return await _context.Comments.CountAsync(c => c.PostId == postId && !c.IsDeleted);
        }

        public async Task<int> GetCommentsCountByAuthorAsync(Guid authorId)
        {
            return await _context.Comments.CountAsync(c => c.AuthorId == authorId && !c.IsDeleted);
        }
    }
}

