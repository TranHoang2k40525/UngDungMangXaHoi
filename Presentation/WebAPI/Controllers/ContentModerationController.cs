using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Infrastructure.Persistence;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Presentation.WebAPI.Controllers
{
    [ApiController]
    [Route("api/content-moderation")]
    [Authorize(Roles = "Admin")]
    public class ContentModerationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ContentModerationController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/content-moderation?type=post&status=pending&page=1&pageSize=20
        [HttpGet]
        public async Task<IActionResult> GetPendingContent(
            [FromQuery] string type = "post", // post or comment
            [FromQuery] string status = "pending", // pending, approved, rejected
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var query = _context.ContentModerations
                    .Include(cm => cm.Account)
                        .ThenInclude(a => a.User)
                    .AsQueryable();

                // Filter by type
                if (type.ToLower() == "post")
                {
                    query = query.Where(cm => cm.ContentType == "Post" && cm.PostId != null);
                    query = query.Include(cm => cm.Post);
                }
                else if (type.ToLower() == "comment")
                {
                    query = query.Where(cm => cm.ContentType == "Comment" && cm.CommentId != null);
                    query = query.Include(cm => cm.Comment);
                }

                // Filter by status
                query = query.Where(cm => cm.Status.ToLower() == status.ToLower());

                var totalCount = await query.CountAsync();

                var moderations = await query
                    .OrderByDescending(cm => cm.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var result = moderations.Select(cm => new
                {
                    id = cm.ModerationID,
                    contentType = cm.ContentType,
                    contentId = cm.ContentID,
                    postId = cm.PostId,
                    commentId = cm.CommentId,
                    author = cm.Account.User?.username?.Value ?? "Unknown",
                    authorId = cm.AccountId,
                    fullName = cm.Account.User?.full_name ?? "N/A",                    content = cm.ContentType == "Post" 
                        ? (cm.Post?.caption ?? "[Nội dung đã bị xóa]")
                        : (cm.Comment?.Content ?? "[Bình luận đã bị xóa]"),                    aiConfidence = cm.AIConfidence,
                    toxicLabel = cm.ToxicLabel,
                    status = cm.Status,
                    createdAt = cm.CreatedAt,
                    riskLevel = cm.ToxicLabel == "safe" 
                        ? (cm.AIConfidence >= 0.8 ? "low" : (cm.AIConfidence >= 0.5 ? "low" : "medium"))
                        : (cm.AIConfidence >= 0.8 ? "high" : (cm.AIConfidence >= 0.5 ? "medium" : "low"))
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
                Console.WriteLine($"❌ Error in GetPendingContent: {ex.Message}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi lấy danh sách nội dung",
                    error = ex.Message
                });
            }
        }

        // POST: api/content-moderation/{id}/approve
        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveContent(int id)
        {
            try
            {
                var moderation = await _context.ContentModerations
                    .Include(cm => cm.Post)
                    .Include(cm => cm.Comment)
                    .FirstOrDefaultAsync(cm => cm.ModerationID == id);

                if (moderation == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Không tìm thấy nội dung"
                    });
                }                // Update moderation status
                moderation.Status = "approved";

                // Update Post or Comment visibility
                if (moderation.ContentType == "Post" && moderation.Post != null)
                {
                    moderation.Post.is_visible = true;
                }
                else if (moderation.ContentType == "Comment" && moderation.Comment != null)
                {
                    moderation.Comment.IsVisible = true;
                    moderation.Comment.IsDeleted = false;
                }

                await _context.SaveChangesAsync();

                Console.WriteLine($"✅ Content approved: {moderation.ContentType} ID {moderation.ContentID}");

                return Ok(new
                {
                    success = true,
                    message = "Đã duyệt nội dung thành công"
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error approving content: {ex.Message}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi duyệt nội dung",
                    error = ex.Message
                });
            }
        }

        // POST: api/content-moderation/{id}/reject
        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectContent(int id, [FromBody] RejectRequest request)
        {
            try
            {
                var moderation = await _context.ContentModerations
                    .Include(cm => cm.Post)
                    .Include(cm => cm.Comment)
                    .FirstOrDefaultAsync(cm => cm.ModerationID == id);

                if (moderation == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Không tìm thấy nội dung"
                    });
                }                // Update moderation status
                moderation.Status = "rejected";

                // Hide Post or Comment when rejected
                if (moderation.ContentType == "Post" && moderation.Post != null)
                {
                    moderation.Post.is_visible = false;
                }
                else if (moderation.ContentType == "Comment" && moderation.Comment != null)
                {
                    moderation.Comment.IsVisible = false;
                }

                // Log the rejection
                var log = new ModerationLog
                {
                    ModerationID = moderation.ModerationID,
                    AdminID = int.Parse(User.FindFirst("AccountId")?.Value ?? "0"),
                    ActionTaken = "rejected",
                    Note = request.Reason,
                    ActionAt = DateTime.UtcNow
                };
                _context.ModerationLogs.Add(log);

                await _context.SaveChangesAsync();

                Console.WriteLine($"✅ Content rejected: {moderation.ContentType} ID {moderation.ContentID}");

                return Ok(new
                {
                    success = true,
                    message = "Đã từ chối nội dung thành công"
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error rejecting content: {ex.Message}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi từ chối nội dung",
                    error = ex.Message
                });
            }
        }

        // DELETE: api/content-moderation/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteContent(int id)
        {
            try
            {
                var moderation = await _context.ContentModerations
                    .Include(cm => cm.Post)
                    .Include(cm => cm.Comment)
                    .FirstOrDefaultAsync(cm => cm.ModerationID == id);

                if (moderation == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Không tìm thấy nội dung"
                    });
                }

                // Delete the actual content
                if (moderation.ContentType == "Post" && moderation.Post != null)
                {
                    _context.Posts.Remove(moderation.Post);
                }
                else if (moderation.ContentType == "Comment" && moderation.Comment != null)
                {
                    _context.Comments.Remove(moderation.Comment);
                }

                // Delete moderation record
                _context.ContentModerations.Remove(moderation);

                await _context.SaveChangesAsync();

                Console.WriteLine($"✅ Content deleted: {moderation.ContentType} ID {moderation.ContentID}");

                return Ok(new
                {
                    success = true,
                    message = "Đã xóa nội dung thành công"
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error deleting content: {ex.Message}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi xóa nội dung",
                    error = ex.Message
                });
            }
        }

        // GET: api/content-moderation/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetContentDetail(int id)
        {
            try
            {
                var moderation = await _context.ContentModerations
                    .Include(cm => cm.Account)
                        .ThenInclude(a => a.User)
                    .Include(cm => cm.Post)
                    .Include(cm => cm.Comment)
                    .Include(cm => cm.ModerationLogs)
                    .FirstOrDefaultAsync(cm => cm.ModerationID == id);

                if (moderation == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Không tìm thấy nội dung"
                    });
                }

                var result = new
                {
                    id = moderation.ModerationID,
                    contentType = moderation.ContentType,
                    contentId = moderation.ContentID,                    author = moderation.Account.User?.username?.Value ?? "Unknown",
                    authorId = moderation.AccountId,
                    fullName = moderation.Account.User?.full_name ?? "N/A",
                    email = moderation.Account.email?.Value ?? "N/A",
                    content = moderation.ContentType == "Post"
                        ? moderation.Post?.caption
                        : moderation.Comment?.Content,
                    aiConfidence = moderation.AIConfidence,
                    toxicLabel = moderation.ToxicLabel,
                    status = moderation.Status,
                    createdAt = moderation.CreatedAt,
                    riskLevel = moderation.AIConfidence >= 0.8 ? "high" : (moderation.AIConfidence >= 0.5 ? "medium" : "low"),
                    logs = moderation.ModerationLogs.Select(log => new
                    {
                        action = log.ActionTaken,
                        reason = log.Note,
                        createdAt = log.ActionAt
                    }).ToList()
                };

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error getting content detail: {ex.Message}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi lấy chi tiết nội dung",
                    error = ex.Message
                });
            }
        }
    }

    public class RejectRequest
    {
        public string Reason { get; set; } = string.Empty;
    }
}
