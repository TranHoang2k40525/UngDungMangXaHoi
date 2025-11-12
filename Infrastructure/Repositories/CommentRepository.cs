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

    public async Task<IEnumerable<Comment>> GetRepliesByCommentIdAsync(int parentCommentId)
    {
        return await _context.Comments
            .Include(c => c.User)
            .Include(c => c.Mentions).ThenInclude(m => m.MentionedAccount).ThenInclude(a => a.User)
            .Include(c => c.Reactions)
            .Where(c => c.ParentCommentId == parentCommentId && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();
    }

    public async Task<int> GetCommentCountByPostIdAsync(int postId)
    {
        return await _context.Comments
            .Where(c => c.PostId == postId && !c.IsDeleted)
            .CountAsync();
    }

    public async Task<int> GetReplyCountByCommentIdAsync(int commentId)
    {
        return await _context.Comments
            .Where(c => c.ParentCommentId == commentId && !c.IsDeleted)
            .CountAsync();
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

    // Mentions
    public async Task<IEnumerable<CommentMention>> GetMentionsByCommentIdAsync(int commentId)
    {
        return await _context.CommentMentions
            .Include(m => m.MentionedAccount).ThenInclude(a => a.User)
            .Where(m => m.CommentId == commentId)
            .ToListAsync();
    }

    public async Task<IEnumerable<Comment>> GetCommentsByMentionedUserAsync(int accountId, int pageNumber = 1, int pageSize = 20)
    {
        var mentionedCommentIds = await _context.CommentMentions
            .Where(m => m.MentionedAccountId == accountId)
            .Select(m => m.CommentId)
            .ToListAsync();

        return await _context.Comments
            .Include(c => c.User)
            .Include(c => c.Post)
            .Where(c => mentionedCommentIds.Contains(c.CommentId) && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
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

    public async Task<Dictionary<string, int>> GetReactionCountsAsync(int commentId)
    {
        return await _context.CommentReactions
            .Where(r => r.CommentId == commentId)
            .GroupBy(r => r.ReactionType)
            .Select(g => new { ReactionType = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ReactionType, x => x.Count);
    }

    // Search
    public async Task<IEnumerable<Comment>> SearchByHashtagAsync(string hashtag, int pageNumber = 1, int pageSize = 20)
    {
        return await _context.Comments
            .Include(c => c.User)
            .Where(c => !c.IsDeleted && c.Hashtags != null && c.Hashtags.Contains(hashtag))
            .OrderByDescending(c => c.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<Comment>> GetCommentsByUserAsync(int accountId, int pageNumber = 1, int pageSize = 20)
    {
        return await _context.Comments
            .Include(c => c.Post)
            .Include(c => c.User)
            .Where(c => c.User!.account_id == accountId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }
}
