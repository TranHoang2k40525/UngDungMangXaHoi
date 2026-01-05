using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Infrastructure.Persistence;
using UngDungMangXaHoi.Application.Interfaces;

namespace UngDungMangXaHoi.Presentation.WebAPI.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class BusinessVerificationController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<BusinessVerificationController> _logger;
    private readonly IAdminActivityLogService _activityLogService;

    public BusinessVerificationController(
        AppDbContext context,
        ILogger<BusinessVerificationController> logger,
        IAdminActivityLogService activityLogService)
    {
        _context = context;
        _logger = logger;
        _activityLogService = activityLogService;
    }

    /// <summary>
    /// [ADMIN] Lấy danh sách yêu cầu xác thực doanh nghiệp
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetVerificationRequests(
        [FromQuery] string status = "pending",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        try
        {            var query = _context.BusinessVerificationRequests
                .Include(r => r.Accounts)
                .Include(r => r.AssignedAdmin)
                .AsQueryable();            // Filter by status
            if (!string.IsNullOrEmpty(status) && status != "all")
            {                if (Enum.TryParse<VerificationStatus>(status, true, out var statusEnum))
                {
                    query = query.Where(r => r.status == statusEnum);
                }            }            // Search by business name, owner name, tax code (skip email in LINQ to avoid null issues)
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(r => 
                    (r.business_name != null && r.business_name.ToLower().Contains(searchLower)) ||
                    (r.owner_name != null && r.owner_name.ToLower().Contains(searchLower)) ||
                    (r.tax_code != null && r.tax_code.ToLower().Contains(searchLower))
                );
            }            var totalCount = await query.CountAsync();

            var requests = await query
                .OrderByDescending(r => r.submitted_at)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            
            // Apply email search filter in memory (after database fetch)
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                requests = requests.Where(r =>
                    (r.business_name != null && r.business_name.ToLower().Contains(searchLower)) ||
                    (r.owner_name != null && r.owner_name.ToLower().Contains(searchLower)) ||
                    (r.tax_code != null && r.tax_code.ToLower().Contains(searchLower)) ||
                    (r.Accounts?.email?.Value != null && r.Accounts.email.Value.ToLower().Contains(searchLower))
                ).ToList();
            }
                  
            var result = requests.Select(r => new
            {
                id = r.request_id,                
                businessName = r.business_name ?? "N/A",
                ownerName = r.owner_name ?? r.Accounts.User?.full_name ?? "Unknown",
                email = r.Accounts.email?.Value,
                phone = r.phone_number ?? r.Accounts.phone?.Value,
                taxCode = r.tax_code ?? $"TAX{r.account_id:D8}",
                businessType = r.business_type ?? "Business",
                address = r.address ?? "N/A",
                website = r.website ?? "N/A",
                description = r.description ?? r.reviewed_notes ?? "Business verification request",
                status = r.status.ToString().ToLower(),
                submittedAt = r.submitted_at,
                reviewedAt = r.reviewed_at,
                reviewedBy = r.AssignedAdmin?.full_name,
                reviewedNotes = r.reviewed_notes,
                documentsUrl = r.documents_url,
                accountId = r.account_id,                // Thông tin user
                user = new
                {
                    accountId = r.account_id,
                    email = r.Accounts.email?.Value,
                    fullName = r.Accounts.User?.full_name ?? r.owner_name ?? "Unknown",
                    phone = r.Accounts.phone?.Value ?? r.phone_number,
                    dateOfBirth = r.Accounts.User?.date_of_birth,
                    gender = r.Accounts.User?.gender,
                    bio = r.Accounts.User?.bio,
                    avatarUrl = r.Accounts.User?.avatar_url,
                    accountType = r.Accounts.account_type.ToString()
                },
                // Thời hạn nâng quyền
                upgrade = new
                {
                    verifiedAt = r.Accounts.business_verified_at,
                    expiresAt = r.Accounts.business_expires_at,
                    daysRemaining = r.Accounts.business_expires_at.HasValue 
                        ? (int)(r.Accounts.business_expires_at.Value - DateTime.UtcNow).TotalDays
                        : (int?)null,
                    isActive = r.Accounts.business_expires_at.HasValue && r.Accounts.business_expires_at.Value > DateTime.UtcNow,
                    isExpired = r.Accounts.business_expires_at.HasValue && r.Accounts.business_expires_at.Value <= DateTime.UtcNow
                },
                // Tình trạng doanh nghiệp
                businessStatus = r.status == VerificationStatus.Approved && 
                                r.Accounts.business_expires_at.HasValue && 
                                r.Accounts.business_expires_at.Value > DateTime.UtcNow 
                    ? "active" 
                    : r.status == VerificationStatus.Approved && 
                      r.Accounts.business_expires_at.HasValue && 
                      r.Accounts.business_expires_at.Value <= DateTime.UtcNow
                    ? "expired"
                    : r.status.ToString().ToLower(),
                upgradedAt = r.Accounts.business_verified_at
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
            _logger.LogError(ex, "Error fetching business verification requests");
            return StatusCode(500, new
            {
                success = false,
                message = "Lỗi khi lấy danh sách yêu cầu xác thực"
            });
        }
    }

    /// <summary>
    /// [ADMIN] Lấy chi tiết yêu cầu xác thực
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetVerificationRequestById(int id)
    {
        try
        {            var request = await _context.BusinessVerificationRequests
                .Include(r => r.Accounts)
                    .ThenInclude(a => a.User)
                .Include(r => r.AssignedAdmin)
                .FirstOrDefaultAsync(r => r.request_id == id);

            if (request == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Không tìm thấy yêu cầu xác thực"
                });            }            
            
            return Ok(new
            {
                success = true,
                data = new
                {                id = request.request_id,
                    businessName = request.business_name ?? "N/A",
                    ownerName = request.owner_name ?? request.Accounts.User?.full_name ?? "Unknown",
                    email = request.Accounts.email?.Value,
                    phone = request.phone_number ?? request.Accounts.phone?.Value,
                    taxCode = request.tax_code ?? $"TAX{request.account_id:D8}",
                    businessType = request.business_type ?? "Business",
                    address = request.address ?? "N/A",
                    website = request.website ?? "N/A",
                    description = request.description ?? request.reviewed_notes ?? "Business verification request",
                    status = request.status.ToString().ToLower(),
                    submittedAt = request.submitted_at,
                    reviewedAt = request.reviewed_at,
                    reviewedBy = request.AssignedAdmin?.full_name,
                    reviewedNotes = request.reviewed_notes,
                    documentsUrl = request.documents_url,
                    expiresAt = request.expires_at,
                    accountId = request.account_id
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching verification request {id}");
            return StatusCode(500, new
            {
                success = false,
                message = "Lỗi khi lấy thông tin yêu cầu xác thực"
            });
        }
    }

    /// <summary>
    /// [ADMIN] Phê duyệt yêu cầu xác thực
    /// </summary>
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveRequest(
        int id,
        [FromBody] ReviewRequestDto dto)
    {
        try
        {
            var adminIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminIdClaim) || !int.TryParse(adminIdClaim, out var adminId))
            {
                return Unauthorized(new { success = false, message = "Unauthorized" });
            }            var request = await _context.BusinessVerificationRequests
                .Include(r => r.Accounts)
                    .ThenInclude(a => a.User)
                .FirstOrDefaultAsync(r => r.request_id == id);

            if (request == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Không tìm thấy yêu cầu xác thực"
                });
            }

            if (request.status != VerificationStatus.Pending)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Yêu cầu đã được xử lý"
                });
            }            // Update verification request
            request.status = VerificationStatus.Approved;
            request.assigned_admin_id = adminId;
            request.reviewed_at = DateTime.UtcNow;
            request.reviewed_notes = dto.AdminNote ?? "Đã phê duyệt";

            // Update account - set business verified
            request.Accounts.account_type = AccountType.Business;
            request.Accounts.business_verified_at = DateTime.UtcNow;
            request.Accounts.business_expires_at = DateTime.UtcNow.AddYears(1); // Valid for 1 year

            await _context.SaveChangesAsync();

            // 🔥 LOG ADMIN ACTION
            await _activityLogService.LogActivityAsync(
                adminAccountId: adminId,
                action: "Phê duyệt doanh nghiệp",
                entityType: "business",
                entityId: id,
                entityName: request.business_name ?? "Business",
                details: $"Phê duyệt xác thực doanh nghiệp '{request.business_name}' - {request.owner_name}",
                status: "success"
            );

            _logger.LogInformation($"Admin {adminId} approved verification request {id}");

            return Ok(new
            {
                success = true,
                message = "Đã phê duyệt yêu cầu xác thực thành công"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error approving verification request {id}");
            return StatusCode(500, new
            {
                success = false,
                message = "Lỗi khi phê duyệt yêu cầu"
            });
        }
    }

    /// <summary>
    /// [ADMIN] Từ chối yêu cầu xác thực
    /// </summary>
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectRequest(
        int id,
        [FromBody] ReviewRequestDto dto)
    {
        try
        {
            var adminIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminIdClaim) || !int.TryParse(adminIdClaim, out var adminId))
            {
                return Unauthorized(new { success = false, message = "Unauthorized" });
            }

            var request = await _context.BusinessVerificationRequests
                .FirstOrDefaultAsync(r => r.request_id == id);

            if (request == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Không tìm thấy yêu cầu xác thực"
                });
            }

            if (request.status != VerificationStatus.Pending)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Yêu cầu đã được xử lý"
                });
            }

            if (string.IsNullOrWhiteSpace(dto.AdminNote))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Vui lòng nhập lý do từ chối"
                });
            }            // Update verification request
            request.status = VerificationStatus.Rejected;
            request.assigned_admin_id = adminId;
            request.reviewed_at = DateTime.UtcNow;
            request.reviewed_notes = dto.AdminNote;

            await _context.SaveChangesAsync();

            // 🔥 LOG ADMIN ACTION
            await _activityLogService.LogActivityAsync(
                adminAccountId: adminId,
                action: "Từ chối doanh nghiệp",
                entityType: "business",
                entityId: id,
                entityName: request.business_name ?? "Business",
                details: $"Từ chối xác thực doanh nghiệp '{request.business_name}' - Lý do: {dto.AdminNote}",
                status: "warning"
            );

            _logger.LogInformation($"Admin {adminId} rejected verification request {id}");

            return Ok(new
            {
                success = true,
                message = "Đã từ chối yêu cầu xác thực"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error rejecting verification request {id}");
            return StatusCode(500, new
            {
                success = false,
                message = "Lỗi khi từ chối yêu cầu"
            });
        }
    }

    /// <summary>
    /// [ADMIN] Lấy thống kê yêu cầu xác thực
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            var totalPending = await _context.BusinessVerificationRequests
                .CountAsync(r => r.status == VerificationStatus.Pending);

            var totalApproved = await _context.BusinessVerificationRequests
                .CountAsync(r => r.status == VerificationStatus.Approved);

            var totalRejected = await _context.BusinessVerificationRequests
                .CountAsync(r => r.status == VerificationStatus.Rejected);

            var totalExpired = await _context.BusinessVerificationRequests
                .CountAsync(r => r.status == VerificationStatus.Expired);

            return Ok(new
            {
                success = true,
                data = new
                {
                    pending = totalPending,
                    approved = totalApproved,
                    rejected = totalRejected,
                    expired = totalExpired,
                    total = totalPending + totalApproved + totalRejected + totalExpired
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching verification stats");
            return StatusCode(500, new
            {
                success = false,
                message = "Lỗi khi lấy thống kê"
            });
        }
    }
}

// DTOs
public class ReviewRequestDto
{
    public string? AdminNote { get; set; }
}
