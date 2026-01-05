using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Presentation.WebAPI.Controllers
{
    [ApiController]
    [Route("api/admin/activity-logs")]
    // [Authorize] // TODO: Bật lại sau khi test xong - Chỉ admin mới có quyền truy cập
    public class AdminActivityLogsController : ControllerBase
    {
        private readonly IAdminActivityLogService _activityLogService;
        private readonly ILogger<AdminActivityLogsController> _logger;
        private readonly AppDbContext _context;

        public AdminActivityLogsController(
            IAdminActivityLogService activityLogService,
            ILogger<AdminActivityLogsController> logger,
            AppDbContext context
        )
        {
            _activityLogService = activityLogService;
            _logger = logger;
            _context = context;
        }

        /// <summary>
        /// Lấy danh sách admin activity logs
        /// GET /api/admin/activity-logs?page=1&pageSize=20&actionType=user&days=7&search=cấm
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<AdminActivityLogListDto>> GetActivityLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? actionType = null,
            [FromQuery] string? adminEmail = null,
            [FromQuery] int? days = null,
            [FromQuery] string? search = null
        )
        {
            try
            {
                // TODO: Kiểm tra quyền admin
                // var currentUserId = GetCurrentUserId();
                // if (!IsAdmin(currentUserId))
                //     return Forbid();

                var result = await _activityLogService.GetActivityLogsAsync(
                    page,
                    pageSize,
                    actionType,
                    adminEmail,
                    days,
                    search
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting activity logs");
                return StatusCode(500, new { error = "Lỗi khi lấy danh sách nhật ký hoạt động" });
            }
        }

        /// <summary>
        /// Lấy thống kê admin activity
        /// GET /api/admin/activity-logs/stats?days=7
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult<AdminActivityStatsDto>> GetActivityStats(
            [FromQuery] int days = 7
        )
        {
            try
            {
                var result = await _activityLogService.GetActivityStatsAsync(days);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting activity stats");
                return StatusCode(500, new { error = "Lỗi khi lấy thống kê hoạt động" });
            }
        }

        /// <summary>
        /// Lấy danh sách admin đang hoạt động
        /// GET /api/admin/activity-logs/active-admins?days=7
        /// </summary>
        [HttpGet("active-admins")]
        public async Task<ActionResult<ActiveAdminsListDto>> GetActiveAdmins(
            [FromQuery] int days = 7
        )
        {
            try
            {
                var result = await _activityLogService.GetActiveAdminsAsync(days);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting active admins");
                return StatusCode(500, new { error = "Lỗi khi lấy danh sách admin hoạt động" });
            }
        }

        /// <summary>
        /// Xuất báo cáo admin activity logs
        /// GET /api/admin/activity-logs/export?startDate=2026-01-01&endDate=2026-01-05&format=csv
        /// </summary>
        [HttpGet("export")]
        public async Task<IActionResult> ExportActivityLogs(
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate,
            [FromQuery] string format = "csv"
        )
        {
            try
            {
                var data = await _activityLogService.ExportActivityLogsAsync(startDate, endDate, format);

                var contentType = format.ToLower() switch
                {
                    "csv" => "text/csv",
                    "json" => "application/json",
                    "pdf" => "application/pdf",
                    _ => "text/csv"
                };

                var fileName = $"admin-activity-logs-{startDate:yyyy-MM-dd}-{endDate:yyyy-MM-dd}.{format}";

                return File(data, contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting activity logs");
                return StatusCode(500, new { error = "Lỗi khi xuất báo cáo" });
            }
        }

        /// <summary>
        /// 🔥 NEW: Lấy thông tin chi tiết của entity
        /// GET /api/admin/activity-logs/entity-details?entityType=user&entityId=123
        /// </summary>
        [HttpGet("entity-details")]
        public async Task<IActionResult> GetEntityDetails(
            [FromQuery] string entityType,
            [FromQuery] int? entityId)
        {
            try
            {
                if (string.IsNullOrEmpty(entityType) || !entityId.HasValue)
                {
                    return BadRequest(new { success = false, message = "EntityType và EntityId là bắt buộc" });
                }

                object? details = null;

                switch (entityType.ToLower())
                {
                    case "user":
                        details = await GetUserDetails(entityId.Value);
                        break;
                    
                    case "post":
                        details = await GetPostDetails(entityId.Value);
                        break;
                    
                    case "comment":
                        details = await GetCommentDetails(entityId.Value);
                        break;
                    
                    case "business":
                        details = await GetBusinessDetails(entityId.Value);
                        break;
                    
                    case "report":
                        details = await GetReportDetails(entityId.Value);
                        break;
                    
                    default:
                        return BadRequest(new { success = false, message = "Entity type không hợp lệ" });
                }

                if (details == null)
                {
                    return NotFound(new { success = false, message = "Không tìm thấy dữ liệu" });
                }

                return Ok(new
                {
                    success = true,
                    entityType,
                    entityId,
                    data = details
                });
            }            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching entity details: {entityType} #{entityId}");
                return StatusCode(500, new { success = false, message = "Lỗi khi lấy thông tin chi tiết" });
            }
        }

        #region Private Helper Methods

        private async Task<object?> GetUserDetails(int userId)
        {
            // ✅ FIX: Tìm theo user_id, không phải account_id
            var user = await _context.Users
                .Include(u => u.Account)
                .FirstOrDefaultAsync(u => u.user_id == userId);

            if (user == null) return null;

            return new
            {
                userId = user.user_id,
                accountId = user.account_id,
                username = user.username?.Value ?? "N/A",
                email = user.Account?.email?.Value ?? "N/A",
                fullName = user.full_name ?? "Unknown",
                phone = user.Account?.phone?.Value,
                gender = user.gender.ToString(),
                dateOfBirth = user.date_of_birth,
                status = user.Account?.status ?? "Unknown",
                accountType = "User",
                createdAt = user.Account?.created_at,
                lastSeen = user.last_seen,
                bio = user.bio,
                address = user.address,
                hometown = user.hometown,
                job = user.job,
                website = user.website,
                isPrivate = user.is_private,
                avatarUrl = user.avatar_url?.Value
            };
        }

        private async Task<object?> GetPostDetails(int postId)
        {
            var post = await _context.Posts
                .Include(p => p.User)
                .Include(p => p.Media)
                .FirstOrDefaultAsync(p => p.post_id == postId);

            if (post == null) return null;

            var reactionsCount = await _context.Reactions
                .Where(r => r.post_id == postId)
                .GroupBy(r => r.reaction_type)
                .Select(g => new { type = g.Key, count = g.Count() })
                .ToListAsync();

            var commentsCount = await _context.Comments
                .CountAsync(c => c.PostId == postId && !c.IsDeleted);

            return new
            {
                postId = post.post_id,
                author = new
                {
                    username = post.User?.username?.Value ?? "N/A",
                    fullName = post.User?.full_name ?? "Unknown",
                    avatarUrl = post.User?.avatar_url?.Value
                },
                caption = post.caption,
                privacy = post.privacy,
                location = post.location,
                isVisible = post.is_visible,
                createdAt = post.created_at,                media = post.Media?.Select(m => new
                {
                    mediaId = m.media_id,
                    type = m.media_type,
                    url = GetFullMediaUrl(m.media_url),
                    order = m.media_order,
                    duration = m.duration
                }).ToList(),
                reactions = reactionsCount,
                commentsCount,                totalReactions = reactionsCount.Sum(r => r.count)
            };
        }

        private async Task<object?> GetCommentDetails(int commentId)
        {
            var comment = await _context.Comments
                .Include(c => c.User)
                .Include(c => c.Post)
                    .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(c => c.CommentId == commentId);

            if (comment == null) return null;

            return new
            {
                commentId = comment.CommentId,
                content = comment.Content,
                author = new
                {
                    username = comment.User?.username?.Value ?? "N/A",
                    fullName = comment.User?.full_name ?? "Unknown",
                    avatarUrl = comment.User?.avatar_url?.Value
                },
                post = new
                {
                    postId = comment.Post?.post_id,
                    caption = comment.Post?.caption,
                    author = comment.Post?.User?.full_name
                },
                parentCommentId = comment.ParentCommentId,
                isVisible = comment.IsVisible,
                isDeleted = comment.IsDeleted,
                isEdited = comment.IsEdited,
                createdAt = comment.CreatedAt,
                updatedAt = comment.UpdatedAt
            };
        }

        private async Task<object?> GetBusinessDetails(int accountId)
        {
            var verificationRequest = await _context.BusinessVerificationRequests
                .Include(r => r.Accounts)
                    .ThenInclude(a => a.User)
                .Include(r => r.AssignedAdmin)
                .FirstOrDefaultAsync(r => r.account_id == accountId);

            if (verificationRequest == null) return null;

            return new
            {
                requestId = verificationRequest.request_id,
                businessName = verificationRequest.business_name,
                ownerName = verificationRequest.owner_name ?? verificationRequest.Accounts.User?.full_name,
                email = verificationRequest.Accounts.email?.Value,
                phone = verificationRequest.phone_number,
                taxCode = verificationRequest.tax_code,
                businessType = verificationRequest.business_type,
                address = verificationRequest.address,
                website = verificationRequest.website,
                description = verificationRequest.description,
                status = verificationRequest.status.ToString(),
                submittedAt = verificationRequest.submitted_at,
                reviewedAt = verificationRequest.reviewed_at,
                reviewedBy = verificationRequest.AssignedAdmin?.full_name,
                reviewedNotes = verificationRequest.reviewed_notes,
                documentsUrl = verificationRequest.documents_url
            };
        }

        private async Task<object?> GetReportDetails(int reportId)
        {
            var report = await _context.Reports
                .Include(r => r.Reporter)
                .Include(r => r.ReportedUser)
                .FirstOrDefaultAsync(r => r.ReportId == reportId);

            if (report == null) return null;

            // Get content details
            object? contentDetails = null;
            if (report.ContentType == "post" && report.ContentId.HasValue)
            {
                var post = await _context.Posts
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.post_id == report.ContentId);
                
                if (post != null)
                {
                    contentDetails = new
                    {
                        type = "post",
                        postId = post.post_id,
                        caption = post.caption,
                        author = post.User?.full_name,
                        isVisible = post.is_visible
                    };
                }
            }
            else if (report.ContentType == "comment" && report.ContentId.HasValue)
            {
                var comment = await _context.Comments
                    .Include(c => c.User)
                    .FirstOrDefaultAsync(c => c.CommentId == report.ContentId);
                
                if (comment != null)
                {
                    contentDetails = new
                    {
                        type = "comment",
                        commentId = comment.CommentId,
                        content = comment.Content,
                        author = comment.User?.full_name,
                        isVisible = comment.IsVisible
                    };
                }
            }

            return new
            {
                reportId = report.ReportId,
                reporter = new
                {
                    username = report.Reporter?.username?.Value,
                    fullName = report.Reporter?.full_name
                },
                reportedUser = new
                {
                    username = report.ReportedUser?.username?.Value,
                    fullName = report.ReportedUser?.full_name
                },
                contentType = report.ContentType,
                contentId = report.ContentId,
                reason = report.Reason,
                description = report.Description,
                status = report.Status,
                adminNote = report.AdminNote,
                createdAt = report.CreatedAt,
                resolvedAt = report.ResolvedAt,                contentDetails
            };
        }

        /// <summary>
        /// Helper method to convert relative media paths to full URLs
        /// </summary>
        private string GetFullMediaUrl(string mediaUrl)
        {
            if (string.IsNullOrEmpty(mediaUrl))
                return string.Empty;

            // If already a full URL (http/https), return as is
            if (mediaUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                mediaUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return mediaUrl;
            }

            // For relative paths or filenames, construct full URL
            // Assumes media is served from /uploads/ or /media/ endpoint
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            
            // If it's just a filename (no path), add default uploads path
            if (!mediaUrl.Contains("/") && !mediaUrl.Contains("\\"))
            {
                return $"{baseUrl}/uploads/posts/{mediaUrl}";
            }

            // If it starts with /, it's already a relative path from root
            if (mediaUrl.StartsWith("/"))
            {
                return $"{baseUrl}{mediaUrl}";
            }

            // Otherwise, treat as relative path and add /uploads/
            return $"{baseUrl}/uploads/{mediaUrl}";
        }

        #endregion
    }
}
