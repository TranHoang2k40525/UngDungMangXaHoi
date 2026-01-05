using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Infrastructure.Persistence;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Application.Interfaces;
using System.Linq;
using System.Security.Claims;

namespace UngDungMangXaHoi.Presentation.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IAdminActivityLogService _activityLogService;

        public UsersController(
            AppDbContext context, 
            IEmailService emailService,
            IAdminActivityLogService activityLogService)
        {
            _context = context;
            _emailService = emailService;
            _activityLogService = activityLogService;
        }

        // GET: api/users?page=1&pageSize=20&search=&filter=all
        [HttpGet]
        public async Task<IActionResult> GetUsers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? filter = "all") // all, active, banned
        {
            try
            {                var query = _context.Accounts
                    .Include(a => a.User)
                    .Include(a => a.Admin)
                    .Where(a => a.Admin == null) // Exclude admin accounts
                    .AsQueryable();

                // Status filter (apply in database)
                if (filter == "active")
                {
                    query = query.Where(a => a.status == "active");
                }
                else if (filter == "banned")
                {
                    query = query.Where(a => a.status == "locked");
                }

                // Get all matching accounts (without search filter)
                var allAccounts = await query
                    .OrderByDescending(a => a.created_at)
                    .ToListAsync();

                // Apply search filter in memory (to support email username search)
                if (!string.IsNullOrWhiteSpace(search))
                {
                    var searchLower = search.ToLower();
                    Console.WriteLine($"🔍 SEARCH DEBUG: Searching for '{searchLower}'");
                    
                    allAccounts = allAccounts.Where(a =>
                    {
                        // Check full name
                        if (a.User?.full_name != null && a.User.full_name.ToLower().Contains(searchLower))
                            return true;
                        
                        // Check username
                        if (a.User?.username?.Value != null && a.User.username.Value.ToLower().Contains(searchLower))
                            return true;
                        
                        // Check email username (part before @)
                        if (a.email?.Value != null)
                        {
                            var emailParts = a.email.Value.Split('@');
                            if (emailParts.Length > 0)
                            {
                                var emailUsername = emailParts[0].ToLower();
                                if (emailUsername.Contains(searchLower))
                                    return true;
                            }
                        }
                        
                        return false;
                    }).ToList();
                }

                var totalCount = allAccounts.Count;
                Console.WriteLine($"🔍 SEARCH RESULT: Found {totalCount} users");

                // Apply pagination
                var accounts = allAccounts
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();
                    
                // Log results
                foreach (var acc in accounts)
                {
                    Console.WriteLine($"  - User: @{acc.User?.username?.Value} | Email: {acc.email?.Value} | Name: {acc.User?.full_name}");
                }

                var result = accounts.Select(a => new
                {
                    id = a.account_id,
                    username = a.User?.username?.Value ?? "N/A",
                    email = a.email?.Value ?? "N/A",
                    fullName = a.User?.full_name ?? "N/A",
                    status = a.status == "locked" ? "banned" : "active",
                    createdAt = a.created_at,
                    accountType = "User"
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
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi lấy danh sách người dùng",
                    error = ex.Message
                });
            }
        }        // POST: api/users/{id}/ban
        [HttpPost("{id}/ban")]
        public async Task<IActionResult> BanUser(int id)
        {
            try
            {
                var adminIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(adminIdStr, out var adminId))
                    return Unauthorized("Invalid admin token");

                var account = await _context.Accounts
                    .Include(a => a.User)
                    .FirstOrDefaultAsync(a => a.account_id == id);                if (account == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Không tìm thấy tài khoản"
                    });
                }

                if (account.Admin != null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Không thể khóa tài khoản Admin"
                    });
                }

                var username = account.User?.username?.Value ?? "N/A";
                var fullName = account.User?.full_name ?? "Unknown";

                account.status = "locked";
                await _context.SaveChangesAsync();

                // 🔥 LOG ADMIN ACTION
                await _activityLogService.LogActivityAsync(
                    adminAccountId: adminId,
                    action: "Cấm người dùng",
                    entityType: "user",
                    entityId: id,
                    entityName: $"@{username}",
                    details: $"Khóa tài khoản người dùng {fullName} (@{username})",
                    status: "success"
                );

                Console.WriteLine($"✅ Account locked: {id} (@{username})");

                // Send email notification
                try
                {
                    var email = account.email?.Value;
                    if (!string.IsNullOrEmpty(email))
                    {
                        await _emailService.SendAccountLockedEmailAsync(
                            email,
                            fullName,
                            "Vi phạm chính sách cộng đồng"
                        );
                        Console.WriteLine($"✅ Email sent to: {email}");
                    }
                }
                catch (Exception emailEx)
                {
                    Console.WriteLine($"⚠️ Failed to send email: {emailEx.Message}");
                }

                return Ok(new
                {
                    success = true,
                    message = "Đã khóa tài khoản thành công"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi khóa tài khoản",
                    error = ex.Message
                });
            }
        }        // POST: api/users/{id}/unban
        [HttpPost("{id}/unban")]
        public async Task<IActionResult> UnbanUser(int id)
        {
            try
            {
                var adminIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(adminIdStr, out var adminId))
                    return Unauthorized("Invalid admin token");

                var account = await _context.Accounts
                    .Include(a => a.User)
                    .FirstOrDefaultAsync(a => a.account_id == id);

                if (account == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Không tìm thấy tài khoản"
                    });
                }

                var username = account.User?.username?.Value ?? "N/A";
                var fullName = account.User?.full_name ?? "Unknown";

                account.status = "active";
                await _context.SaveChangesAsync();

                // 🔥 LOG ADMIN ACTION
                await _activityLogService.LogActivityAsync(
                    adminAccountId: adminId,
                    action: "Mở khóa người dùng",
                    entityType: "user",
                    entityId: id,
                    entityName: $"@{username}",
                    details: $"Mở khóa tài khoản người dùng {fullName} (@{username})",
                    status: "success"
                );

                Console.WriteLine($"✅ Account unlocked: {id} (@{username})");

                // Send email notification
                try
                {
                    var email = account.email?.Value;
                    if (!string.IsNullOrEmpty(email))
                    {
                        await _emailService.SendAccountUnlockedEmailAsync(email, fullName);
                        Console.WriteLine($"✅ Email sent to: {email}");
                    }
                }
                catch (Exception emailEx)
                {
                    Console.WriteLine($"⚠️ Failed to send email: {emailEx.Message}");
                }

                return Ok(new
                {
                    success = true,
                    message = "Đã mở khóa tài khoản thành công"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi mở khóa tài khoản",
                    error = ex.Message
                });
            }
        }

        // GET: api/users/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            try
            {
                var account = await _context.Accounts
                    .Include(a => a.User)
                    .FirstOrDefaultAsync(a => a.account_id == id);

                if (account == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Không tìm thấy tài khoản"
                    });
                }                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        id = account.account_id,
                        username = account.User?.username?.Value ?? "N/A",
                        email = account.email?.Value ?? "N/A",
                        fullName = account.User?.full_name ?? "N/A",
                        status = account.status == "locked" ? "banned" : "active",
                        createdAt = account.created_at,
                        accountType = "User",
                        bio = account.User?.bio,
                        dateOfBirth = account.User?.date_of_birth,
                        gender = account.User?.gender,
                        avatarUrl = account.User?.avatar_url,
                        isPrivate = account.User?.is_private
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi lấy thông tin người dùng",
                    error = ex.Message
                });
            }
        }
    }
}
