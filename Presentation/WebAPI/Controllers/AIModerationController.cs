using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Presentation.WebAPI.Controllers
{
    [ApiController]
    [Route("api/ai-moderation")]
    [Authorize(Roles = "Admin")]
    public class AIModerationController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;

        public AIModerationController(AppDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }        
        
        // 1. GET: Thống kê tổng quan AI moderation
        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics()
        {
            try
            {
                // Tổng số nội dung đã kiểm tra
                var totalChecked = await _context.ContentModerations.CountAsync();

                // Số nội dung an toàn (Status = "approved")
                var safeContent = await _context.ContentModerations
                    .CountAsync(m => m.Status == "approved");

                // Số nội dung vi phạm (Status = "rejected" hoặc "blocked")
                var violatingContent = await _context.ContentModerations
                    .CountAsync(m => m.Status == "rejected" || m.Status == "blocked");

                // Tổng số người dùng vi phạm (unique)
                var violatingUsers = await _context.ContentModerations
                    .Where(m => m.Status == "rejected" || m.Status == "blocked")
                    .Select(m => m.AccountId)
                    .Distinct()
                    .CountAsync();

                // Thống kê theo loại nội dung
                var postViolations = await _context.ContentModerations
                    .Where(m => m.ContentType == "Post" && (m.Status == "rejected" || m.Status == "blocked"))
                    .CountAsync();

                var commentViolations = await _context.ContentModerations
                    .Where(m => m.ContentType == "Comment" && (m.Status == "rejected" || m.Status == "blocked"))
                    .CountAsync();                // Thống kê vi phạm theo thời gian (7 ngày gần nhất)
                var last7Days = DateTime.UtcNow.AddDays(-7);
                var recentViolationsData = await _context.ContentModerations
                    .Where(m => (m.Status == "rejected" || m.Status == "blocked") && m.CreatedAt.HasValue && m.CreatedAt >= last7Days)
                    .Select(m => m.CreatedAt!.Value.Date)
                    .ToListAsync();
                
                var recentViolations = recentViolationsData
                    .GroupBy(date => date)
                    .Select(g => new
                    {
                        Date = g.Key,
                        Count = g.Count()
                    })
                    .OrderBy(x => x.Date)
                    .ToList();

                // Top 5 labels vi phạm nhiều nhất
                var topLabels = await _context.ContentModerations
                    .Where(m => m.Status == "rejected" || m.Status == "blocked")
                    .GroupBy(m => m.ToxicLabel)
                    .Select(g => new
                    {
                        Label = g.Key,
                        Count = g.Count()
                    })
                    .OrderByDescending(x => x.Count)
                    .Take(5)
                    .ToListAsync();

                return Ok(new
                {
                    totalChecked,
                    safeContent,
                    violatingContent,
                    violatingUsers,
                    breakdown = new
                    {
                        posts = postViolations,
                        comments = commentViolations
                    },
                    recentTrends = recentViolations,
                    topViolationTypes = topLabels
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy thống kê", error = ex.Message });
            }
        }

        // 2. GET: Danh sách người dùng vi phạm nhiều lần
        [HttpGet("frequent-violators")]
        public async Task<IActionResult> GetFrequentViolators([FromQuery] int minViolations = 5)
        {            try
            {
                var violators = await _context.ContentModerations
                    .Where(m => m.Status == "rejected" || m.Status == "blocked")
                    .GroupBy(m => m.AccountId)
                    .Select(g => new
                    {
                        AccountId = g.Key,
                        ViolationCount = g.Count(),
                        LatestViolation = g.Max(m => m.CreatedAt),
                        ToxicLabels = g.Select(m => m.ToxicLabel).Distinct().ToList()
                    })
                    .Where(x => x.ViolationCount >= minViolations)
                    .OrderByDescending(x => x.ViolationCount)
                    .ToListAsync();// Join với Account và User để lấy thông tin chi tiết
                var violatorDetails = new List<object>();
                foreach (var violator in violators)
                {
                    var account = await _context.Accounts
                        .Include(a => a.User)
                        .FirstOrDefaultAsync(a => a.account_id == violator.AccountId);                    if (account != null)
                    {
                        // Lấy last login từ LoginHistory table
                        var lastLogin = await _context.LoginHistory
                            .Where(lh => lh.account_id == account.account_id)
                            .OrderByDescending(lh => lh.login_time)
                            .Select(lh => lh.login_time)
                            .FirstOrDefaultAsync();

                        violatorDetails.Add(new
                        {
                            accountId = account.account_id,
                            email = account.email?.Value,
                            fullName = account.User?.full_name ?? "N/A",
                            username = account.User?.username?.Value ?? "N/A",
                            violationCount = violator.ViolationCount,
                            latestViolation = violator.LatestViolation,
                            toxicLabels = violator.ToxicLabels,
                            lastLogin = lastLogin,
                            accountStatus = account.status == "locked" ? "Locked" : "Active"                        });
                    }
                }

                return Ok(new
                {
                    data = violatorDetails,
                    total = violatorDetails.Count,
                    page = 1,
                    pageSize = violatorDetails.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy danh sách người vi phạm", error = ex.Message });
            }
        }        // 3. GET: Báo cáo chi tiết các nội dung vi phạm
        [HttpGet("violation-reports")]
        public async Task<IActionResult> GetViolationReports(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? type = null,
            [FromQuery] string? riskLevel = null,
            [FromQuery] string? toxicLabel = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var query = _context.ContentModerations
                    .Where(m => m.Status == "rejected" || m.Status == "blocked")
                    .Include(m => m.Account)
                        .ThenInclude(a => a.User)
                    .AsQueryable();

                // Filter by content type (post/comment)
                if (!string.IsNullOrEmpty(type) && type != "all")
                {
                    var contentType = type.ToLower() == "post" ? "Post" : "Comment";
                    query = query.Where(m => m.ContentType == contentType);
                }

                // Filter by toxic label
                if (!string.IsNullOrEmpty(toxicLabel) && toxicLabel != "all")
                    query = query.Where(m => m.ToxicLabel == toxicLabel);

                // Filter by risk level (based on AI confidence)
                if (!string.IsNullOrEmpty(riskLevel) && riskLevel != "all")
                {
                    if (riskLevel == "high")
                        query = query.Where(m => m.AIConfidence >= 0.8);
                    else if (riskLevel == "medium")
                        query = query.Where(m => m.AIConfidence >= 0.5 && m.AIConfidence < 0.8);
                    else if (riskLevel == "low")
                        query = query.Where(m => m.AIConfidence < 0.5);
                }

                if (startDate.HasValue)
                    query = query.Where(m => m.CreatedAt.HasValue && m.CreatedAt >= startDate.Value);

                if (endDate.HasValue)
                    query = query.Where(m => m.CreatedAt.HasValue && m.CreatedAt <= endDate.Value);var totalCount = await query.CountAsync();
                var data = await query
                    .OrderByDescending(m => m.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var reports = data.Select(m => new
                {
                    moderationId = m.ModerationID,
                    contentType = m.ContentType,
                    contentId = m.ContentID,
                    accountId = m.AccountId,
                    email = m.Account?.email?.Value ?? "N/A",
                    fullName = m.Account?.User?.full_name ?? "N/A",
                    toxicLabel = m.ToxicLabel,
                    confidence = m.AIConfidence,
                    checkedAt = m.CreatedAt,
                    status = m.Status
                }).ToList();

                return Ok(new
                {
                    totalCount,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                    reports
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy báo cáo vi phạm", error = ex.Message });
            }
        }

        // 4. GET: Lịch sử vi phạm của một người dùng cụ thể
        [HttpGet("user-violations/{accountId}")]
        public async Task<IActionResult> GetUserViolations(int accountId)
        {
            try
            {
                var account = await _context.Accounts
                    .Include(a => a.User)
                    .FirstOrDefaultAsync(a => a.account_id == accountId);                if (account == null)
                    return NotFound(new { message = "Không tìm thấy tài khoản" });                var violations = await _context.ContentModerations
                    .Where(m => m.AccountId == accountId && (m.Status == "rejected" || m.Status == "blocked"))
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(m => new
                    {
                        moderationId = m.ModerationID,
                        contentType = m.ContentType,
                        contentId = m.ContentID,
                        toxicLabel = m.ToxicLabel,
                        confidence = m.AIConfidence,
                        checkedAt = m.CreatedAt,
                        status = m.Status,
                        // Lấy nội dung gốc nếu có
                        content = m.ContentType == "Post"
                            ? _context.Posts.Where(p => p.post_id == m.ContentID).Select(p => p.caption).FirstOrDefault()
                            : _context.Comments.Where(c => c.CommentId == m.ContentID).Select(c => c.Content).FirstOrDefault()
                    })
                    .ToListAsync();

                // Thống kê theo label
                var labelStats = violations
                    .GroupBy(v => v.toxicLabel)
                    .Select(g => new
                    {
                        label = g.Key,
                        count = g.Count()
                    })
                    .OrderByDescending(x => x.count)
                    .ToList();                return Ok(new
                {
                    accountInfo = new
                    {
                        accountId = account.account_id,
                        email = account.email?.Value,
                        fullName = account.User?.full_name ?? "N/A",
                        username = account.User?.username?.Value ?? "N/A",
                        isLocked = account.status == "locked"
                    },
                    totalViolations = violations.Count,
                    labelStatistics = labelStats,
                    violations
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy lịch sử vi phạm", error = ex.Message });
            }
        }

        // 5. DELETE: Xóa tài khoản vi phạm và gửi email thông báo
        [HttpDelete("delete-violator/{accountId}")]
        public async Task<IActionResult> DeleteViolator(int accountId, [FromBody] DeleteViolatorRequest request)
        {
            try
            {
                var account = await _context.Accounts
                    .Include(a => a.User)
                    .FirstOrDefaultAsync(a => a.account_id == accountId);

                if (account == null)
                    return NotFound(new { message = "Không tìm thấy tài khoản" });                // Đếm số lần vi phạm
                var violationCount = await _context.ContentModerations
                    .Where(m => m.AccountId == accountId && (m.Status == "rejected" || m.Status == "blocked"))
                    .CountAsync();                // Gửi email thông báo
                var emailValue = account.email?.Value;
                if (!string.IsNullOrEmpty(emailValue))
                {
                    try
                    {
                        await _emailService.SendAccountDeletionEmailAsync(
                            emailValue,
                            account.User?.full_name ?? "User",
                            request.Reason,
                            violationCount
                        );
                        Console.WriteLine($"✅ Email deletion notification sent to: {emailValue}");
                    }
                    catch (Exception emailEx)
                    {
                        // Log lỗi email nhưng vẫn tiếp tục xóa account
                        Console.WriteLine($"❌ Email error: {emailEx.Message}");
                    }
                }
                else
                {
                    Console.WriteLine("⚠️ No email found for account, skipping email notification");
                }

                // Xóa account (cascade sẽ xóa User và các dữ liệu liên quan)
                _context.Accounts.Remove(account);
                await _context.SaveChangesAsync();
                Console.WriteLine($"✅ Account deleted: {accountId}");return Ok(new
                {
                    message = "Đã xóa tài khoản thành công",
                    deletedAccountId = accountId,
                    email = account.email?.Value,
                    violationCount
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi xóa tài khoản", error = ex.Message });
            }
        }
    }

    // DTO cho request xóa tài khoản
    public class DeleteViolatorRequest
    {
        public string Reason { get; set; } = string.Empty;
    }
}
