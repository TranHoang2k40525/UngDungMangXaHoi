using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories;

public class CommentRepository : ICommentRepository
{
    private readonly AppDbContext _context;

    public CommentRepository(AppDbContext context)
    {
        _context = context;
    }

    // Create
    public async Task<Comment> CreateAsync(Comment comment)
    {
        await _context.Comments.AddAsync(comment);
        await _context.SaveChangesAsync();
        return comment;
    }

    // Read
    public async Task<Comment?> GetByIdAsync(int commentId)
    {
        return await _context.Comments
            .Include(c => c.User)
            .Include(c => c.Mentions).ThenInclude(m => m.MentionedAccount).ThenInclude(a => a.User)
            .Include(c => c.Reactions).ThenInclude(r => r.Account).ThenInclude(a => a.User)
            .Include(c => c.Replies)
                .ThenInclude(r => r.User)
            .FirstOrDefaultAsync(c => c.CommentId == commentId && !c.IsDeleted);
    }

    public async Task<IEnumerable<Comment>> GetCommentsByPostIdAsync(int postId, int pageNumber = 1, int pageSize = 20)
    {
        // Lấy TẤT CẢ comments của post (bao gồm cả replies) để frontend tự xử lý hierarchy
        return await _context.Comments
            .Include(c => c.User)
            .Include(c => c.Mentions).ThenInclude(m => m.MentionedAccount).ThenInclude(a => a.User)
            .Include(c => c.Reactions)
            .Where(c => c.PostId == postId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(); // Không dùng pagination để lấy hết tất cả comments
    }

    public async Task<int> GetCommentCountByPostIdAsync(int postId)
    {
        return await _context.Comments
            .Where(c => c.PostId == postId && !c.IsDeleted)
            .CountAsync();
    }

    public async Task<Dictionary<int, int>> GetCommentCountsByPostIdsAsync(IEnumerable<int> postIds)
    {
        // Batch load comment counts for multiple posts in single query
        return await _context.Comments
            .Where(c => postIds.Contains(c.PostId) && !c.IsDeleted)
            .GroupBy(c => c.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count);
    }

    // Update
    public async Task<Comment> UpdateAsync(Comment comment)
    {
        _context.Comments.Update(comment);
        await _context.SaveChangesAsync();
        return comment;
    }

    // Delete
    public async Task<bool> DeleteAsync(int commentId)
    {
        var comment = await _context.Comments.FindAsync(commentId);
        if (comment == null) return false;

        _context.Comments.Remove(comment);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SoftDeleteAsync(int commentId)
    {
        var comment = await _context.Comments.FindAsync(commentId);
        if (comment == null) return false;

        comment.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    // Reactions
    public async Task<CommentReaction?> GetReactionAsync(int commentId, int accountId)
    {
        return await _context.CommentReactions
            .FirstOrDefaultAsync(r => r.CommentId == commentId && r.AccountId == accountId);
    }

    public async Task<CommentReaction> AddReactionAsync(CommentReaction reaction)
    {
        await _context.CommentReactions.AddAsync(reaction);
        
        // Update likes count on comment
        var comment = await _context.Comments.FindAsync(reaction.CommentId);
        if (comment != null)
        {
            comment.LikesCount++;
            _context.Comments.Update(comment);
        }
        
        await _context.SaveChangesAsync();
        return reaction;
    }

    public async Task<bool> RemoveReactionAsync(int commentId, int accountId)
    {
        var reaction = await _context.CommentReactions
            .FirstOrDefaultAsync(r => r.CommentId == commentId && r.AccountId == accountId);
        
        if (reaction == null) return false;

        _context.CommentReactions.Remove(reaction);
        
        // Update likes count on comment
        var comment = await _context.Comments.FindAsync(commentId);
        if (comment != null && comment.LikesCount > 0)
        {
            comment.LikesCount--;
            _context.Comments.Update(comment);
        }
        
        await _context.SaveChangesAsync();
        return true;
    }

}
