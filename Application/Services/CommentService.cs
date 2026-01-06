using System.Text.RegularExpressions;
using Microsoft.Extensions.DependencyInjection;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services;

public class CommentService
{
    private readonly ICommentRepository _commentRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationRepository _notificationRepository;
    private readonly IRealTimeNotificationService _realTimeNotificationService;
    private readonly IPostRepository _postRepository;
    private readonly IContentModerationService _moderationService;
    private readonly IContentModerationRepository _moderationRepository;
    private readonly IServiceScopeFactory _scopeFactory;

    public CommentService(
        ICommentRepository commentRepository,
        IUserRepository userRepository,
        INotificationRepository notificationRepository,
        IRealTimeNotificationService realTimeNotificationService,
        IPostRepository postRepository,
        IContentModerationService moderationService,
        IContentModerationRepository moderationRepository,
        IServiceScopeFactory scopeFactory)
    {
        _commentRepository = commentRepository;
        _userRepository = userRepository;
        _notificationRepository = notificationRepository;
        _realTimeNotificationService = realTimeNotificationService;
        _postRepository = postRepository;
        _moderationService = moderationService;
        _moderationRepository = moderationRepository;
        _scopeFactory = scopeFactory;
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

        // TẠO COMMENT TRƯỚC (như Instagram/Facebook - UX mượt mà)
        var comment = new Comment
        {
            PostId = dto.PostId,
            UserId = user.user_id,
            Content = dto.Content,
            Hashtags = string.Join(",", hashtags),
            ParentCommentId = dto.ParentCommentId,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false,
            LikesCount = 0,
            IsEdited = false
        };

        var createdComment = await _commentRepository.CreateAsync(comment);
        
        // Gửi thông báo ngay
        await SendCommentNotificationAsync(createdComment, user);

        // KIỂM TRA TOXIC TRONG BACKGROUND (với scope riêng)
        _= Task.Run(async () => await CheckAndDeleteToxicCommentAsync(createdComment.CommentId, dto.Content, currentAccountId, user.user_id));

        // Fetch complete comment with all includes
        var fullComment = await _commentRepository.GetByIdAsync(createdComment.CommentId);
        return MapToDto(fullComment!);
    }

    // Background moderation check (chạy trong scope riêng)
    private async Task CheckAndDeleteToxicCommentAsync(int commentId, string content, int accountId, int userId)
    {
        using var scope = _scopeFactory.CreateScope();
        
        var commentRepository = scope.ServiceProvider.GetRequiredService<ICommentRepository>();
        var moderationService = scope.ServiceProvider.GetRequiredService<IContentModerationService>();
        var moderationRepository = scope.ServiceProvider.GetRequiredService<IContentModerationRepository>();
        var notificationRepository = scope.ServiceProvider.GetRequiredService<INotificationRepository>();
        var realTimeNotificationService = scope.ServiceProvider.GetRequiredService<IRealTimeNotificationService>();
        
        try
        {
            Console.WriteLine($"[MODERATION] Checking comment {commentId}...");
            
            var moderationResult = await moderationService.AnalyzeTextAsync(content);
            
            Console.WriteLine($"[MODERATION] Result for comment {commentId}: Label={moderationResult.Label}, RiskLevel={moderationResult.RiskLevel}");
            
            // Lưu kết quả moderation vào database
            var moderation = new ContentModeration
            {
                ContentType = "Comment",
                ContentID = commentId,
                AccountId = accountId,
                PostId = null,
                CommentId = commentId,
                AIConfidence = moderationResult.Confidence,
                ToxicLabel = moderationResult.Label,
                Status = moderationResult.RiskLevel switch
                {
                    "high_risk" => "blocked",
                    "medium_risk" => "pending",
                    "low_risk" => "approved",
                    _ => "approved"
                },
                CreatedAt = DateTime.UtcNow
            };
            
            await moderationRepository.CreateAsync(moderation);
            
            // Nếu high_risk → Đợi 6 giây rồi xóa comment và thông báo cho user
            if (moderationResult.RiskLevel == "high_risk")
            {
                Console.WriteLine($"[MODERATION] Comment {commentId} is toxic ({moderationResult.Label}). Waiting 6 seconds before deletion...");
                
                // Đợi 6 giây (như Instagram/Facebook)
                await Task.Delay(6000);
                
                Console.WriteLine($"[MODERATION] DELETING toxic comment {commentId}: {moderationResult.Label}");
                
                await commentRepository.SoftDeleteAsync(commentId);
                
                // Gửi notification cho user về việc comment bị xóa
                var notification = new Notification
                {
                    user_id = userId,
                    sender_id = userId,
                    type = NotificationType.Comment,
                    content = $"Comment của bạn đã bị xóa do vi phạm quy định cộng đồng ({moderationResult.Label})",
                    is_read = false,
                    created_at = DateTimeOffset.UtcNow
                };
                
                await notificationRepository.AddAsync(notification);
                
                var notificationDto = new NotificationDto
                {
                    NotificationId = notification.notification_id,
                    UserId = userId,
                    Content = notification.content,
                    Type = NotificationType.Comment,
                    IsRead = false,
                    CreatedAt = notification.created_at
                };
                
                await realTimeNotificationService.SendNotificationToUserAsync(userId, notificationDto);
                
                Console.WriteLine($"[MODERATION] Sent deletion notification to user {userId}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[MODERATION] Error checking comment {commentId}: {ex.Message}");
            Console.WriteLine($"[MODERATION] Stack trace: {ex.StackTrace}");
        }
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

        // KIỂM TRA TOXIC KHI SỬA COMMENT VÀ LƯU KẾT QUẢ NGAY CẢ KHI CHẶN
        var moderationResult = await _moderationService.AnalyzeTextAsync(newContent);
        
        // ✅ LƯU KẾT QUẢ MODERATION TRƯỚC KHI CHẶN
        if (moderationResult.RiskLevel == "high_risk")
        {
            // Lưu vi phạm vào database
            try
            {
                var violationLog = new ContentModeration
                {
                    ContentType = "Comment_Update_Blocked",
                    ContentID = commentId,
                    AccountId = currentAccountId,
                    PostId = null,
                    CommentId = commentId,
                    AIConfidence = moderationResult.Confidence,
                    ToxicLabel = moderationResult.Label,
                    Status = "blocked",
                    CreatedAt = DateTime.UtcNow
                };
                await _moderationRepository.CreateAsync(violationLog);
                Console.WriteLine($"[Moderation] Saved blocked comment update for comment {commentId}: {moderationResult.Label}");
            }
            catch (Exception saveEx)
            {
                Console.WriteLine($"[Moderation Error] Failed to save violation: {saveEx.Message}");
            }

            throw new Exception($"Comment bị chặn do vi phạm: {moderationResult.Label}");
        }

        // Update comment
        var hashtags = ExtractHashtags(newContent);
        comment.Content = newContent;
        comment.Hashtags = string.Join(",", hashtags);
        comment.IsEdited = true;
        comment.UpdatedAt = DateTime.UtcNow;
        
        var updatedComment = await _commentRepository.UpdateAsync(comment);

        // ✅ LƯU KẾT QUẢ MODERATION CHO COMMENT HỢP LỆ
        await SaveModerationResultAsync(moderationResult, "Comment_Update", commentId, currentAccountId, null, commentId);

        return MapToDto(updatedComment);
    }

    // Delete Comment (soft delete) - returns deleted comment dto for broadcasting
    public async Task<CommentDto> DeleteCommentAsync(int commentId, int currentAccountId)
    {
        var comment = await _commentRepository.GetByIdAsync(commentId);
        
        if (comment == null)
            throw new Exception("Comment not found");

        var user = await _userRepository.GetByAccountIdAsync(currentAccountId);
        if (user == null || comment.UserId != user.user_id)
            throw new UnauthorizedAccessException("You can only delete your own comments");

        // Map to DTO before soft-deleting so callers can broadcast the postId / commentId
        var dto = MapToDto(comment);

        var deleted = await _commentRepository.SoftDeleteAsync(commentId);
        if (!deleted)
            throw new Exception("Failed to delete comment");

        return dto;
    }

    // Get Comments by Post
    public async Task<IEnumerable<CommentDto>> GetCommentsByPostIdAsync(int postId, int page = 1, int pageSize = 20)
    {
        var comments = await _commentRepository.GetCommentsByPostIdAsync(postId, page, pageSize);
        return comments.Select(MapToDto);
    }

    // Get Comment by ID
    public async Task<CommentDto?> GetCommentByIdAsync(int commentId)
    {
        var comment = await _commentRepository.GetByIdAsync(commentId);
        return comment != null ? MapToDto(comment) : null;
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

    // Gửi thông báo khi có comment mới
    private async Task SendCommentNotificationAsync(Comment comment, User commenter)
    {
        try
        {
            // Lấy thông tin bài viết
            var post = await _postRepository.GetByIdAsync(comment.PostId);
            if (post == null) return;

            // Nếu comment vào bài viết của người khác
            if (post.user_id != commenter.user_id)
            {
                var notification = new Notification
                {
                    user_id = post.user_id,
                    sender_id = commenter.user_id,
                    type = NotificationType.Comment,
                    post_id = post.post_id,
                    comment_id = comment.CommentId,
                    content = $"{commenter.username.Value} đã bình luận vào bài viết của bạn",
                    is_read = false,
                    created_at = DateTimeOffset.UtcNow
                };

                await _notificationRepository.AddAsync(notification);

                // Gửi real-time notification
                var notificationDto = new NotificationDto
                {
                    NotificationId = notification.notification_id,
                    UserId = notification.user_id,
                    SenderId = notification.sender_id,
                    SenderUsername = commenter.username.Value,
                    SenderAvatar = commenter.avatar_url?.Value,
                    Type = notification.type,
                    PostId = notification.post_id,
                    CommentId = comment.CommentId,
                    Content = notification.content,
                    IsRead = notification.is_read,
                    CreatedAt = notification.created_at
                };

                await _realTimeNotificationService.SendNotificationToUserAsync(post.user_id, notificationDto);
            }

            // Nếu là reply comment (có ParentCommentId)
            if (comment.ParentCommentId.HasValue)
            {
                var parentComment = await _commentRepository.GetByIdAsync(comment.ParentCommentId.Value);
                if (parentComment != null && parentComment.UserId != commenter.user_id)
                {
                    var notification = new Notification
                    {
                        user_id = parentComment.User.user_id,
                        sender_id = commenter.user_id,
                        type = NotificationType.CommentReply,
                        post_id = post.post_id,
                        comment_id = comment.CommentId,
                        content = $"{commenter.username.Value} đã trả lời bình luận của bạn",
                        is_read = false,
                        created_at = DateTimeOffset.UtcNow
                    };

                    await _notificationRepository.AddAsync(notification);

                    // Gửi real-time notification
                    var notificationDto = new NotificationDto
                    {
                        NotificationId = notification.notification_id,
                        UserId = notification.user_id,
                        SenderId = notification.sender_id,
                        SenderUsername = commenter.username.Value,
                        SenderAvatar = commenter.avatar_url?.Value,
                        Type = notification.type,
                        PostId = notification.post_id,
                        CommentId = comment.CommentId,
                        Content = notification.content,
                        IsRead = notification.is_read,
                        CreatedAt = notification.created_at
                    };

                    await _realTimeNotificationService.SendNotificationToUserAsync(parentComment.User.user_id, notificationDto);
                }
            }

            // Xử lý @mentions
            await ProcessMentionsAsync(comment.CommentId, comment.Content, commenter);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CommentService] Error sending notification: {ex.Message}");
            // Không throw exception để không ảnh hưởng đến việc tạo comment
        }
    }

    // Process @mentions in comment
    private async Task ProcessMentionsAsync(int commentId, string content, User commenter)
    {
        var mentionedUsernames = ExtractMentions(content);
        if (!mentionedUsernames.Any()) return;

        foreach (var username in mentionedUsernames)
        {
            try
            {
                var mentionedUser = await _userRepository.GetByUsernameAsync(username);
                if (mentionedUser != null && mentionedUser.user_id != commenter.user_id)
                {
                    var comment = await _commentRepository.GetByIdAsync(commentId);
                    
                    var notification = new Notification
                    {
                        user_id = mentionedUser.user_id,
                        sender_id = commenter.user_id,
                        type = NotificationType.Mention,
                        post_id = comment?.PostId,
                        comment_id = commentId,
                        content = $"{commenter.username.Value} đã nhắc đến bạn trong một bình luận",
                        is_read = false,
                        created_at = DateTimeOffset.UtcNow
                    };

                    await _notificationRepository.AddAsync(notification);

                    // Gửi real-time notification
                    var notificationDto = new NotificationDto
                    {
                        NotificationId = notification.notification_id,
                        UserId = notification.user_id,
                        SenderId = notification.sender_id,
                        SenderUsername = commenter.username.Value,
                        SenderAvatar = commenter.avatar_url?.Value,
                        Type = notification.type,
                        PostId = notification.post_id,
                        CommentId = commentId,
                        Content = notification.content,
                        IsRead = notification.is_read,
                        CreatedAt = notification.created_at
                    };

                    await _realTimeNotificationService.SendNotificationToUserAsync(mentionedUser.user_id, notificationDto);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CommentService] Error processing mention for @{username}: {ex.Message}");
            }
        }
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

    // LƯU KẾT QUẢ MODERATION VÀO DATABASE
    private async Task SaveModerationResultAsync(ModerationResult result, string contentType, int contentId, int accountId, int? postId, int? commentId)
    {
        var moderation = new ContentModeration
        {
            ContentType = contentType,
            ContentID = contentId,
            AccountId = accountId,
            PostId = postId,
            CommentId = commentId,
            AIConfidence = result.Confidence,
            ToxicLabel = result.Label,
            Status = result.RiskLevel switch
            {
                "high_risk" => "blocked",
                "medium_risk" => "pending",
                "low_risk" => "approved",
                _ => "approved"
            },
            CreatedAt = DateTime.UtcNow
        };

        await _moderationRepository.CreateAsync(moderation);
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
                .GroupBy(r => $"{r.ReactionType}_{r.AccountId}")
                .ToDictionary(g => g.Key, g => g.Count()) ?? new Dictionary<string, int>(),
            ReplyCount = comment.Replies?.Count ?? 0,
            Replies = new List<CommentDto>() // Load separately to avoid circular reference
        };
    }
}
