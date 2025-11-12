using System.Text.RegularExpressions;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services;

public class CommentService
{
    private readonly ICommentRepository _commentRepository;
    private readonly IUserRepository _userRepository;

    public CommentService(
        ICommentRepository commentRepository,
        IUserRepository userRepository)
    {
        _commentRepository = commentRepository;
        _userRepository = userRepository;
    }

    // Create Comment
    public async Task<CommentDto> CreateCommentAsync(CreateCommentDto dto, int currentAccountId)
    {
        // Get User from AccountId
        var user = await _userRepository.GetByAccountIdAsync(currentAccountId);
        if (user == null)
            throw new Exception("User not found");

        // Extract hashtags from content
        var hashtags = ExtractHashtags(dto.Content);

        // Create comment entity - Giữ nguyên parentCommentId từ frontend (nested replies)
        var comment = new Comment
        {
            PostId = dto.PostId,
            UserId = user.user_id,
            Content = dto.Content,
            Hashtags = string.Join(",", hashtags),
            ParentCommentId = dto.ParentCommentId, // Giữ nguyên - cho phép nested
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false,
            LikesCount = 0,
            IsEdited = false
        };

        var createdComment = await _commentRepository.CreateAsync(comment);
        
        // Parse @mentions and save to database
        await ProcessMentionsAsync(createdComment.CommentId, dto.Content);

        // Fetch complete comment with all includes
        var fullComment = await _commentRepository.GetByIdAsync(createdComment.CommentId);
        return MapToDto(fullComment!);
    }

    // Update Comment
    public async Task<CommentDto> UpdateCommentAsync(int commentId, string newContent, int currentAccountId)
    {
        var comment = await _commentRepository.GetByIdAsync(commentId);
        
        if (comment == null)
            throw new Exception("Comment not found");

        var user = await _userRepository.GetByAccountIdAsync(currentAccountId);
        if (user == null || comment.UserId != user.user_id)
            throw new UnauthorizedAccessException("You can only edit your own comments");

        // Update comment
        var hashtags = ExtractHashtags(newContent);
        comment.Content = newContent;
        comment.Hashtags = string.Join(",", hashtags);
        comment.IsEdited = true;
        comment.UpdatedAt = DateTime.UtcNow;
        
        var updatedComment = await _commentRepository.UpdateAsync(comment);

        return MapToDto(updatedComment);
    }

    // Delete Comment (soft delete)
    public async Task<bool> DeleteCommentAsync(int commentId, int currentAccountId)
    {
        var comment = await _commentRepository.GetByIdAsync(commentId);
        
        if (comment == null)
            throw new Exception("Comment not found");

        var user = await _userRepository.GetByAccountIdAsync(currentAccountId);
        if (user == null || comment.UserId != user.user_id)
            throw new UnauthorizedAccessException("You can only delete your own comments");

        return await _commentRepository.SoftDeleteAsync(commentId);
    }

    // Get Comments by Post
    public async Task<IEnumerable<CommentDto>> GetCommentsByPostIdAsync(int postId, int page = 1, int pageSize = 20)
    {
        var comments = await _commentRepository.GetCommentsByPostIdAsync(postId, page, pageSize);
        return comments.Select(MapToDto);
    }

    // Get Replies
    public async Task<IEnumerable<CommentDto>> GetRepliesAsync(int commentId)
    {
        var replies = await _commentRepository.GetRepliesByCommentIdAsync(commentId);
        return replies.Select(MapToDto);
    }

    // Get Comment Count
    public async Task<int> GetCommentCountAsync(int postId)
    {
        return await _commentRepository.GetCommentCountByPostIdAsync(postId);
    }

    // Add Reaction
    public async Task<CommentReaction> AddReactionAsync(int commentId, int accountId, string reactionType)
    {
        var existingReaction = await _commentRepository.GetReactionAsync(commentId, accountId);
        
        if (existingReaction != null)
        {
            // Remove old reaction first
            await _commentRepository.RemoveReactionAsync(commentId, accountId);
        }

        var reaction = new CommentReaction
        {
            CommentId = commentId,
            AccountId = accountId,
            ReactionType = reactionType,
            CreatedAt = DateTime.UtcNow
        };

        return await _commentRepository.AddReactionAsync(reaction);
    }

    // Remove Reaction
    public async Task<bool> RemoveReactionAsync(int commentId, int accountId)
    {
        return await _commentRepository.RemoveReactionAsync(commentId, accountId);
    }

    // Get Reaction Counts
    public async Task<Dictionary<string, int>> GetReactionCountsAsync(int commentId)
    {
        return await _commentRepository.GetReactionCountsAsync(commentId);
    }

    // Process @mentions in comment
    private async Task ProcessMentionsAsync(int commentId, string content)
    {
        var mentionedUsernames = ExtractMentions(content);
        if (!mentionedUsernames.Any()) return;

        // For now, just store in MentionedUserIds field as CSV
        // TODO: Implement proper CommentMentions table later
    }

    // Extract @mentions from text
    private List<string> ExtractMentions(string content)
    {
        var regex = new Regex(@"@(\w+)");
        var matches = regex.Matches(content);
        return matches.Select(m => m.Groups[1].Value).Distinct().ToList();
    }

    // Extract #hashtags from text
    private List<string> ExtractHashtags(string content)
    {
        var regex = new Regex(@"#(\w+)");
        var matches = regex.Matches(content);
        return matches.Select(m => m.Groups[1].Value).Distinct().ToList();
    }

    // Map Comment to DTO
    private CommentDto MapToDto(Comment comment)
    {
        return new CommentDto
        {
            CommentId = comment.CommentId,
            PostId = comment.PostId,
            AccountId = comment.User?.account_id ?? 0,
            UserId = comment.User?.user_id ?? 0, // Thêm user_id để frontend điều hướng profile
            AuthorName = comment.User?.username?.Value ?? comment.User?.full_name ?? "",
            AuthorAvatar = comment.User?.avatar_url?.Value,
            Content = comment.Content,
            ParentCommentId = comment.ParentCommentId,
            CreatedAt = comment.CreatedAt,
            UpdatedAt = comment.UpdatedAt,
            IsEdited = comment.IsEdited,
            Hashtags = string.IsNullOrEmpty(comment.Hashtags) 
                ? new List<string>() 
                : comment.Hashtags.Split(',').ToList(),
            Mentions = comment.Mentions?.Select(m => new MentionDto
            {
                AccountId = m.MentionedAccountId,
                Username = m.MentionedAccount?.User?.username?.Value ?? "",
                DisplayName = m.MentionedAccount?.User?.full_name ?? "",
                StartPosition = m.StartPosition,
                Length = m.Length
            }).ToList() ?? new List<MentionDto>(),
            ReactionCounts = comment.Reactions?
                .GroupBy(r => r.ReactionType)
                .ToDictionary(g => g.Key, g => g.Count()) ?? new Dictionary<string, int>(),
            ReplyCount = comment.Replies?.Count ?? 0,
            Replies = new List<CommentDto>() // Load separately to avoid circular reference
        };
    }
}
