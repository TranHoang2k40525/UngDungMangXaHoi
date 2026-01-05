using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Infrastructure.Persistence;
using UngDungMangXaHoi.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace UngDungMangXaHoi.Presentation.WebAPI.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<ReportsController> _logger;
    private readonly IAdminActivityLogService _activityLogService;

    public ReportsController(
        AppDbContext context,
        ILogger<ReportsController> logger,
        IAdminActivityLogService activityLogService)
    {
        _context = context;
        _logger = logger;
        _activityLogService = activityLogService;
    }

    /// <summary>
    /// [USER] Create a new report
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateReport([FromBody] CreateReportRequest request)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var reporterId))
            {
                return Unauthorized(new { success = false, message = "Unauthorized" });
            }

            // Validate request
            if (string.IsNullOrEmpty(request.ContentType) || string.IsNullOrEmpty(request.Reason))
            {
                return BadRequest(new { success = false, message = "ContentType và Reason là bắt buộc" });
            }

            // Check if reporter is trying to report themselves
            if (request.ReportedUserId.HasValue && request.ReportedUserId == reporterId)
            {
                return BadRequest(new { success = false, message = "Không thể báo cáo chính mình" });
            }

            // Create report
            var report = new Report
            {
                ReporterId = reporterId,
                ReportedUserId = request.ReportedUserId,
                ContentType = request.ContentType,
                ContentId = request.ContentId,
                Reason = request.Reason,
                Description = request.Description,
                Status = "pending",
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.Reports.Add(report);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"User {reporterId} created report {report.ReportId} for {request.ContentType} {request.ContentId}");

            return Ok(new
            {
                success = true,
                message = "Báo cáo đã được gửi thành công",
                reportId = report.ReportId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating report");
            return StatusCode(500, new { success = false, message = "Lỗi khi tạo báo cáo" });
        }
    }

    /// <summary>
    /// [ADMIN] Get all reports with filtering
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetReports(
        [FromQuery] string status = "pending",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var query = _context.Reports
                .Include(r => r.Reporter)
                .Include(r => r.ReportedUser)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status) && status != "all")
            {
                query = query.Where(r => r.Status == status);
            }

            var totalCount = await query.CountAsync();

            var reports = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();            var result = reports.Select(r => new
            {
                id = r.ReportId,
                type = r.ContentType,
                contentId = r.ContentId,
                reporter = r.Reporter?.username?.Value ?? $"user{r.ReporterId}",
                reporterName = r.Reporter?.full_name ?? "Unknown",
                reportedUser = r.ReportedUser?.username?.Value ?? (r.ReportedUserId.HasValue ? $"user{r.ReportedUserId}" : null),
                reportedUserName = r.ReportedUser?.full_name,
                reason = r.Reason,
                description = r.Description,
                status = r.Status,
                adminNote = r.AdminNote,
                createdAt = r.CreatedAt,
                resolvedAt = r.ResolvedAt
            }).ToList();

            return Ok(new
            {
                success = true,
                data = result,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching reports");
            return StatusCode(500, new { success = false, message = "Lỗi khi lấy danh sách báo cáo" });
        }
    }

    /// <summary>
    /// [ADMIN] Get report details
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetReportById(int id)
    {
        try
        {
            var report = await _context.Reports
                .Include(r => r.Reporter)
                .Include(r => r.ReportedUser)
                .FirstOrDefaultAsync(r => r.ReportId == id);

            if (report == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy báo cáo" });
            }

            // Get content details based on type
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
                        postId = post.post_id,
                        caption = post.caption,
                        author = post.User?.username?.Value,
                        authorName = post.User?.full_name,
                        createdAt = post.created_at,
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
                        commentId = comment.CommentId,
                        content = comment.Content,
                        author = comment.User?.username?.Value,
                        authorName = comment.User?.full_name,
                        createdAt = comment.CreatedAt,
                        isVisible = comment.IsVisible
                    };
                }
            }            return Ok(new
            {
                success = true,
                data = new
                {
                    id = report.ReportId,
                    type = report.ContentType,
                    contentId = report.ContentId,
                    reporter = report.Reporter?.username?.Value,
                    reporterName = report.Reporter?.full_name,
                    reportedUser = report.ReportedUser?.username?.Value,
                    reportedUserName = report.ReportedUser?.full_name,
                    reason = report.Reason,
                    description = report.Description,
                    status = report.Status,
                    adminNote = report.AdminNote,
                    createdAt = report.CreatedAt,
                    resolvedAt = report.ResolvedAt,
                    contentDetails
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching report {id}");
            return StatusCode(500, new { success = false, message = "Lỗi khi lấy thông tin báo cáo" });
        }
    }

    /// <summary>
    /// [ADMIN] Resolve a report (approve violation)
    /// </summary>
    [HttpPost("{id}/resolve")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResolveReport(int id, [FromBody] ResolveReportRequest request)
    {        try
        {
            var adminAccountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminAccountIdClaim) || !int.TryParse(adminAccountIdClaim, out var adminAccountId))
            {
                return Unauthorized(new { success = false, message = "Unauthorized" });
            }

            // Get admin_id from Admins table using account_id
            var admin = await _context.Admins.FirstOrDefaultAsync(a => a.account_id == adminAccountId);
            if (admin == null)
            {
                return Unauthorized(new { success = false, message = "Admin not found" });
            }

            var report = await _context.Reports.FindAsync(id);
            if (report == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy báo cáo" });
            }

            if (report.Status != "pending")
            {
                return BadRequest(new { success = false, message = "Báo cáo đã được xử lý" });
            }

            // Update report status
            report.Status = "resolved";
            report.AdminNote = request.AdminNote;
            report.ResolvedBy = admin.admin_id; // Use admin_id instead of account_id
            report.ResolvedAt = DateTimeOffset.UtcNow;// Handle content deletion if requested
            if (request.DeleteContent && report.ContentId.HasValue)
            {
                if (report.ContentType == "post")
                {
                    var post = await _context.Posts.FindAsync(report.ContentId.Value);
                    if (post != null)
                    {
                        post.is_visible = false;
                        // Post entity doesn't have is_deleted, just hide it
                    }
                }
                else if (report.ContentType == "comment")
                {
                    var comment = await _context.Comments.FindAsync(report.ContentId.Value);
                    if (comment != null)
                    {
                        comment.IsVisible = false;
                        comment.IsDeleted = true;
                    }
                }
            }            // Handle user ban if requested
            if (request.BanUser && report.ReportedUserId.HasValue)
            {
                var user = await _context.Users
                    .Include(u => u.Account)
                    .FirstOrDefaultAsync(u => u.user_id == report.ReportedUserId.Value);
                
                if (user != null && user.Account != null)
                {                    // Ban the account by changing status
                    user.Account.status = "banned";
                    
                    // Create sanction record
                    var sanction = new AccountSanction
                    {
                        account_id = user.account_id,
                        admin_id = admin.admin_id, // Use admin_id instead of account_id
                        action_type = request.BanDuration.HasValue ? "Temporary Ban" : "Permanent Ban",
                        reason = $"Vi phạm: {report.Reason}",
                        start_at = DateTime.UtcNow,
                        end_at = request.BanDuration.HasValue 
                            ? DateTime.UtcNow.AddDays(request.BanDuration.Value) 
                            : null,
                        is_active = true
                    };
                    _context.AccountSanctions.Add(sanction);
                }
            }

            await _context.SaveChangesAsync();

            // 🔥 LOG ADMIN ACTION
            var actionDetails = $"Xử lý báo cáo #{id} - {report.Reason}";
            if (request.DeleteContent) actionDetails += " | Đã xóa nội dung";
            if (request.BanUser) actionDetails += " | Đã cấm người dùng";
            
            await _activityLogService.LogActivityAsync(
                adminAccountId: adminAccountId,
                action: "Xử lý báo cáo",
                entityType: "report",
                entityId: id,
                entityName: $"Report #{id}",
                details: actionDetails,
                status: "success"
            );

            _logger.LogInformation($"Admin (account_id={adminAccountId}, admin_id={admin.admin_id}) resolved report {id}");

            return Ok(new
            {
                success = true,
                message = "Đã xử lý báo cáo thành công"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error resolving report {id}");
            return StatusCode(500, new { success = false, message = "Lỗi khi xử lý báo cáo" });
        }
    }

    /// <summary>
    /// [ADMIN] Reject a report (no violation found)
    /// </summary>
    [HttpPost("{id}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RejectReport(int id, [FromBody] RejectReportRequest request)
    {
        try
        {
            var adminAccountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminAccountIdClaim) || !int.TryParse(adminAccountIdClaim, out var adminAccountId))
            {
                return Unauthorized(new { success = false, message = "Unauthorized" });
            }

            // Get admin_id from Admins table using account_id
            var admin = await _context.Admins.FirstOrDefaultAsync(a => a.account_id == adminAccountId);
            if (admin == null)
            {
                return Unauthorized(new { success = false, message = "Admin not found" });
            }

            var report = await _context.Reports.FindAsync(id);
            if (report == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy báo cáo" });
            }

            if (report.Status != "pending")
            {
                return BadRequest(new { success = false, message = "Báo cáo đã được xử lý" });
            }            report.Status = "rejected";
            report.AdminNote = request.AdminNote ?? "Không phát hiện vi phạm";
            report.ResolvedBy = admin.admin_id; // Use admin_id instead of account_id
            report.ResolvedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            // 🔥 LOG ADMIN ACTION
            await _activityLogService.LogActivityAsync(
                adminAccountId: adminAccountId,
                action: "Từ chối báo cáo",
                entityType: "report",
                entityId: id,
                entityName: $"Report #{id}",
                details: $"Từ chối báo cáo #{id} - {report.Reason} - {report.AdminNote}",
                status: "info"
            );

            _logger.LogInformation($"Admin (account_id={adminAccountId}, admin_id={admin.admin_id}) rejected report {id}");

            return Ok(new
            {
                success = true,
                message = "Đã từ chối báo cáo"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error rejecting report {id}");
            return StatusCode(500, new { success = false, message = "Lỗi khi từ chối báo cáo" });
        }
    }

    /// <summary>
    /// [ADMIN] Get violation statistics for a user
    /// </summary>
    [HttpGet("user/{userId}/stats")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetUserViolationStats(int userId)
    {
        try
        {
            var totalReports = await _context.Reports
                .Where(r => r.ReportedUserId == userId && r.Status == "resolved")
                .CountAsync();

            var last30Days = await _context.Reports
                .Where(r => r.ReportedUserId == userId && r.Status == "resolved" 
                       && r.CreatedAt >= DateTime.UtcNow.AddDays(-30))
                .CountAsync();

            var last7Days = await _context.Reports
                .Where(r => r.ReportedUserId == userId && r.Status == "resolved" 
                       && r.CreatedAt >= DateTime.UtcNow.AddDays(-7))
                .CountAsync();

            return Ok(new
            {
                success = true,
                data = new
                {
                    userId,
                    totalViolations = totalReports,
                    violations30Days = last30Days,
                    violations7Days = last7Days
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error getting violation stats for user {userId}");
            return StatusCode(500, new { success = false, message = "Lỗi khi lấy thống kê vi phạm" });
        }
    }
}

// DTOs
public class CreateReportRequest
{
    public int? ReportedUserId { get; set; }
    public string ContentType { get; set; } = string.Empty; // "post", "comment", "user", "message"
    public int? ContentId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class ResolveReportRequest
{
    public string? AdminNote { get; set; }
    public bool DeleteContent { get; set; } = false;
    public bool BanUser { get; set; } = false;
    public int? BanDuration { get; set; } // days, null = permanent
}

public class RejectReportRequest
{
    public string? AdminNote { get; set; }
}
