# Backend Implementation Guide - Admin Activity Logs

## 📋 Tổng Quan

Hướng dẫn này giúp Backend Team implement API endpoints cho tính năng **Nhật ký Hoạt động Admin**.

Frontend đã hoàn thành 100%. Backend cần implement các API endpoints để kết nối.

---

## 🗄️ Database Schema

### Bảng: AdminActivityLogs

```sql
CREATE TABLE AdminActivityLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    AdminId UNIQUEIDENTIFIER NOT NULL,
    AdminEmail NVARCHAR(255) NOT NULL,
    AdminName NVARCHAR(255) NOT NULL,

    Action NVARCHAR(500) NOT NULL,
    ActionType NVARCHAR(50) NOT NULL, -- 'user', 'post', 'business', 'comment', 'report', 'system'

    EntityType NVARCHAR(50) NOT NULL,
    EntityId NVARCHAR(255),
    EntityName NVARCHAR(500),

    Details NVARCHAR(MAX),
    IpAddress NVARCHAR(50),
    UserAgent NVARCHAR(500),

    Status NVARCHAR(50) DEFAULT 'success', -- 'success', 'warning', 'error', 'info'

    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_AdminActivityLogs_Admin FOREIGN KEY (AdminId)
        REFERENCES Accounts(AccountId) ON DELETE CASCADE
);

-- Indexes để tối ưu truy vấn
CREATE INDEX IX_AdminActivityLogs_AdminId ON AdminActivityLogs(AdminId);
CREATE INDEX IX_AdminActivityLogs_CreatedAt ON AdminActivityLogs(CreatedAt DESC);
CREATE INDEX IX_AdminActivityLogs_ActionType ON AdminActivityLogs(ActionType);
CREATE INDEX IX_AdminActivityLogs_Status ON AdminActivityLogs(Status);

-- Composite index cho queries phức tạp
CREATE INDEX IX_AdminActivityLogs_AdminId_CreatedAt
    ON AdminActivityLogs(AdminId, CreatedAt DESC);
CREATE INDEX IX_AdminActivityLogs_ActionType_CreatedAt
    ON AdminActivityLogs(ActionType, CreatedAt DESC);
```

### Migration Script

```sql
-- Create table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AdminActivityLogs')
BEGIN
    CREATE TABLE AdminActivityLogs (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AdminId UNIQUEIDENTIFIER NOT NULL,
        AdminEmail NVARCHAR(255) NOT NULL,
        AdminName NVARCHAR(255) NOT NULL,
        Action NVARCHAR(500) NOT NULL,
        ActionType NVARCHAR(50) NOT NULL,
        EntityType NVARCHAR(50) NOT NULL,
        EntityId NVARCHAR(255),
        EntityName NVARCHAR(500),
        Details NVARCHAR(MAX),
        IpAddress NVARCHAR(50),
        UserAgent NVARCHAR(500),
        Status NVARCHAR(50) DEFAULT 'success',
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    -- Add indexes
    CREATE INDEX IX_AdminActivityLogs_AdminId ON AdminActivityLogs(AdminId);
    CREATE INDEX IX_AdminActivityLogs_CreatedAt ON AdminActivityLogs(CreatedAt DESC);
    CREATE INDEX IX_AdminActivityLogs_ActionType ON AdminActivityLogs(ActionType);
    CREATE INDEX IX_AdminActivityLogs_Status ON AdminActivityLogs(Status);
    CREATE INDEX IX_AdminActivityLogs_AdminId_CreatedAt ON AdminActivityLogs(AdminId, CreatedAt DESC);
    CREATE INDEX IX_AdminActivityLogs_ActionType_CreatedAt ON AdminActivityLogs(ActionType, CreatedAt DESC);

    PRINT 'Table AdminActivityLogs created successfully';
END
ELSE
BEGIN
    PRINT 'Table AdminActivityLogs already exists';
END
GO
```

---

## 🏗️ Domain Layer

### Entity: AdminActivityLog.cs

```csharp
// Domain/Entities/AdminActivityLog.cs
using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class AdminActivityLog
    {
        public Guid Id { get; set; }
        public Guid AdminId { get; set; }
        public string AdminEmail { get; set; }
        public string AdminName { get; set; }

        public string Action { get; set; }
        public string ActionType { get; set; }

        public string EntityType { get; set; }
        public string EntityId { get; set; }
        public string EntityName { get; set; }

        public string Details { get; set; }
        public string IpAddress { get; set; }
        public string UserAgent { get; set; }

        public string Status { get; set; }

        public DateTime CreatedAt { get; set; }

        // Navigation
        public virtual Account Admin { get; set; }
    }
}
```

---

## 📦 Infrastructure Layer

### Repository Interface

```csharp
// Application/Interfaces/IAdminActivityLogRepository.cs
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Application.Interfaces
{
    public interface IAdminActivityLogRepository
    {
        Task<AdminActivityLog> CreateAsync(AdminActivityLog log);
        Task<(List<AdminActivityLog> logs, int total)> GetLogsAsync(
            int page,
            int pageSize,
            string actionType = null,
            string adminEmail = null,
            int? days = null,
            string search = null
        );
        Task<ActivityStatsDto> GetStatsAsync(int days = 7);
        Task<List<ActiveAdminDto>> GetActiveAdminsAsync(int days = 7);
    }
}
```

### Repository Implementation

```csharp
// Infrastructure/Repositories/AdminActivityLogRepository.cs
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.Interfaces;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Infrastructure.Data;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class AdminActivityLogRepository : IAdminActivityLogRepository
    {
        private readonly ApplicationDbContext _context;

        public AdminActivityLogRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<AdminActivityLog> CreateAsync(AdminActivityLog log)
        {
            log.Id = Guid.NewGuid();
            log.CreatedAt = DateTime.UtcNow;

            _context.AdminActivityLogs.Add(log);
            await _context.SaveChangesAsync();

            return log;
        }

        public async Task<(List<AdminActivityLog> logs, int total)> GetLogsAsync(
            int page,
            int pageSize,
            string actionType = null,
            string adminEmail = null,
            int? days = null,
            string search = null)
        {
            var query = _context.AdminActivityLogs.AsQueryable();

            // Filter by action type
            if (!string.IsNullOrEmpty(actionType) && actionType != "all")
            {
                query = query.Where(l => l.ActionType == actionType);
            }

            // Filter by admin email
            if (!string.IsNullOrEmpty(adminEmail))
            {
                query = query.Where(l => l.AdminEmail == adminEmail);
            }

            // Filter by date range
            if (days.HasValue && days.Value > 0)
            {
                var cutoffDate = DateTime.UtcNow.AddDays(-days.Value);
                query = query.Where(l => l.CreatedAt >= cutoffDate);
            }

            // Search
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(l =>
                    l.Action.ToLower().Contains(searchLower) ||
                    l.AdminName.ToLower().Contains(searchLower) ||
                    l.AdminEmail.ToLower().Contains(searchLower) ||
                    l.EntityName.ToLower().Contains(searchLower)
                );
            }

            // Count total
            var total = await query.CountAsync();

            // Pagination
            var logs = await query
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (logs, total);
        }

        public async Task<ActivityStatsDto> GetStatsAsync(int days = 7)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-days);
            var last24Hours = DateTime.UtcNow.AddDays(-1);

            var logs = await _context.AdminActivityLogs
                .Where(l => l.CreatedAt >= cutoffDate)
                .ToListAsync();

            var stats = new ActivityStatsDto
            {
                TotalActions = logs.Count,
                ActiveAdmins = logs.Select(l => l.AdminEmail).Distinct().Count(),
                Last24Hours = logs.Count(l => l.CreatedAt >= last24Hours),
                AveragePerDay = logs.Count / Math.Max(days, 1),
                TopActions = logs
                    .GroupBy(l => l.Action)
                    .OrderByDescending(g => g.Count())
                    .Take(5)
                    .Select(g => new ActionCountDto
                    {
                        Action = g.Key,
                        Count = g.Count()
                    })
                    .ToList()
            };

            return stats;
        }

        public async Task<List<ActiveAdminDto>> GetActiveAdminsAsync(int days = 7)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-days);

            var activeAdmins = await _context.AdminActivityLogs
                .Where(l => l.CreatedAt >= cutoffDate)
                .GroupBy(l => new { l.AdminEmail, l.AdminName })
                .Select(g => new ActiveAdminDto
                {
                    Email = g.Key.AdminEmail,
                    Name = g.Key.AdminName,
                    ActionCount = g.Count()
                })
                .OrderByDescending(a => a.ActionCount)
                .ToListAsync();

            return activeAdmins;
        }
    }
}
```

---

## 📊 DTOs

```csharp
// Application/DTOs/AdminActivityLog/ActivityStatsDto.cs
using System.Collections.Generic;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class ActivityStatsDto
    {
        public int TotalActions { get; set; }
        public int ActiveAdmins { get; set; }
        public int Last24Hours { get; set; }
        public int AveragePerDay { get; set; }
        public List<ActionCountDto> TopActions { get; set; }
    }

    public class ActionCountDto
    {
        public string Action { get; set; }
        public int Count { get; set; }
    }

    public class ActiveAdminDto
    {
        public string Email { get; set; }
        public string Name { get; set; }
        public int ActionCount { get; set; }
    }
}
```

---

## 🎯 Application Layer

### Service Interface

```csharp
// Application/Interfaces/IActivityLogService.cs
using System;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Application.Interfaces
{
    public interface IActivityLogService
    {
        Task LogActivityAsync(
            Guid adminId,
            string adminEmail,
            string adminName,
            string action,
            string actionType,
            string entityType,
            string entityId,
            string entityName,
            string details,
            string ipAddress = null,
            string userAgent = null,
            string status = "success"
        );
    }
}
```

### Service Implementation

```csharp
// Application/Services/ActivityLogService.cs
using System;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.Interfaces;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Application.Services
{
    public class ActivityLogService : IActivityLogService
    {
        private readonly IAdminActivityLogRepository _repository;

        public ActivityLogService(IAdminActivityLogRepository repository)
        {
            _repository = repository;
        }

        public async Task LogActivityAsync(
            Guid adminId,
            string adminEmail,
            string adminName,
            string action,
            string actionType,
            string entityType,
            string entityId,
            string entityName,
            string details,
            string ipAddress = null,
            string userAgent = null,
            string status = "success")
        {
            var log = new AdminActivityLog
            {
                AdminId = adminId,
                AdminEmail = adminEmail,
                AdminName = adminName,
                Action = action,
                ActionType = actionType,
                EntityType = entityType,
                EntityId = entityId,
                EntityName = entityName,
                Details = details,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Status = status
            };

            await _repository.CreateAsync(log);
        }
    }
}
```

---

## 🎮 API Controller

```csharp
// Presentation/WebAPI/Controllers/AdminActivityLogsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.Interfaces;

namespace UngDungMangXaHoi.Presentation.WebAPI.Controllers
{
    [ApiController]
    [Route("api/admin/activity-logs")]
    [Authorize] // Chỉ admin mới truy cập được
    public class AdminActivityLogsController : ControllerBase
    {
        private readonly IAdminActivityLogRepository _repository;

        public AdminActivityLogsController(IAdminActivityLogRepository repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Lấy danh sách nhật ký hoạt động
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string actionType = "all",
            [FromQuery] string adminEmail = "",
            [FromQuery] int days = 7,
            [FromQuery] string search = "")
        {
            try
            {
                var (logs, total) = await _repository.GetLogsAsync(
                    page,
                    pageSize,
                    actionType == "all" ? null : actionType,
                    string.IsNullOrEmpty(adminEmail) ? null : adminEmail,
                    days,
                    string.IsNullOrEmpty(search) ? null : search
                );

                var totalPages = (int)Math.Ceiling(total / (double)pageSize);

                return Ok(new
                {
                    logs = logs.Select(l => new
                    {
                        l.Id,
                        l.AdminName,
                        l.AdminEmail,
                        l.Action,
                        l.ActionType,
                        EntityType = l.EntityType,
                        EntityName = l.EntityName,
                        l.Details,
                        l.IpAddress,
                        Timestamp = l.CreatedAt,
                        l.Status
                    }),
                    total,
                    page,
                    pageSize,
                    totalPages
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi tải nhật ký", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy thống kê tổng quan
        /// </summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats([FromQuery] int days = 7)
        {
            try
            {
                var stats = await _repository.GetStatsAsync(days);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi tải thống kê", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách admin đang hoạt động
        /// </summary>
        [HttpGet("active-admins")]
        public async Task<IActionResult> GetActiveAdmins([FromQuery] int days = 7)
        {
            try
            {
                var admins = await _repository.GetActiveAdminsAsync(days);
                return Ok(new { admins });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi tải danh sách admin", error = ex.Message });
            }
        }

        /// <summary>
        /// Xuất báo cáo (TODO: Implement export service)
        /// </summary>
        [HttpGet("export")]
        public async Task<IActionResult> Export(
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate,
            [FromQuery] string format = "csv")
        {
            // TODO: Implement export functionality
            return NotImplemented("Export feature will be implemented soon");
        }
    }
}
```

---

## 🔧 Dependency Injection Setup

```csharp
// Presentation/WebAPI/Program.cs hoặc Startup.cs

// Add to services
builder.Services.AddScoped<IAdminActivityLogRepository, AdminActivityLogRepository>();
builder.Services.AddScoped<IActivityLogService, ActivityLogService>();
```

---

## 📝 Sử Dụng Logging Service

### Example 1: Log khi cấm user

```csharp
// Trong UserController
[HttpPost("{userId}/ban")]
public async Task<IActionResult> BanUser(Guid userId)
{
    var user = await _userService.GetByIdAsync(userId);
    await _userService.BanAsync(userId);

    // Log activity
    var adminId = GetCurrentAdminId(); // Helper method
    var adminEmail = GetCurrentAdminEmail();
    var adminName = GetCurrentAdminName();
    var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
    var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

    await _activityLogService.LogActivityAsync(
        adminId,
        adminEmail,
        adminName,
        "Cấm người dùng",
        "user",
        "user",
        userId.ToString(),
        $"@{user.Username}",
        $"Người dùng {user.Username} đã bị cấm do vi phạm quy định",
        ipAddress,
        userAgent,
        "success"
    );

    return Ok(new { message = "Đã cấm người dùng thành công" });
}
```

### Example 2: Log khi xóa bài đăng

```csharp
[HttpDelete("posts/{postId}")]
public async Task<IActionResult> DeletePost(Guid postId)
{
    var post = await _postService.GetByIdAsync(postId);
    await _postService.DeleteAsync(postId);

    await _activityLogService.LogActivityAsync(
        GetCurrentAdminId(),
        GetCurrentAdminEmail(),
        GetCurrentAdminName(),
        "Xóa bài đăng vi phạm",
        "post",
        "post",
        postId.ToString(),
        $"Bài đăng #{postId.ToString().Substring(0, 8)}",
        $"Bài đăng vi phạm tiêu chuẩn cộng đồng đã bị xóa",
        GetIpAddress(),
        GetUserAgent(),
        "success"
    );

    return Ok();
}
```

### Example 3: Log khi phê duyệt doanh nghiệp

```csharp
[HttpPost("business/{requestId}/approve")]
public async Task<IActionResult> ApproveBusinessRequest(Guid requestId)
{
    var request = await _businessService.GetRequestAsync(requestId);
    await _businessService.ApproveAsync(requestId);

    await _activityLogService.LogActivityAsync(
        GetCurrentAdminId(),
        GetCurrentAdminEmail(),
        GetCurrentAdminName(),
        "Phê duyệt tài khoản doanh nghiệp",
        "business",
        "business",
        requestId.ToString(),
        request.BusinessName,
        $"Đã phê duyệt yêu cầu xác thực cho {request.BusinessName}",
        GetIpAddress(),
        GetUserAgent(),
        "success"
    );

    return Ok();
}
```

---

## 🧪 Testing

### Unit Test Example

```csharp
// Tests/ActivityLogServiceTests.cs
using Xunit;
using Moq;
using System;
using System.Threading.Tasks;

public class ActivityLogServiceTests
{
    [Fact]
    public async Task LogActivityAsync_ShouldCreateLog()
    {
        // Arrange
        var mockRepo = new Mock<IAdminActivityLogRepository>();
        var service = new ActivityLogService(mockRepo.Object);

        // Act
        await service.LogActivityAsync(
            Guid.NewGuid(),
            "admin@test.com",
            "Test Admin",
            "Test Action",
            "user",
            "user",
            "123",
            "@testuser",
            "Test details",
            "127.0.0.1",
            "Mozilla/5.0",
            "success"
        );

        // Assert
        mockRepo.Verify(r => r.CreateAsync(It.IsAny<AdminActivityLog>()), Times.Once);
    }
}
```

---

## 📋 Checklist Implementation

### Phase 1: Database

-   [ ] Chạy migration script tạo bảng AdminActivityLogs
-   [ ] Tạo indexes
-   [ ] Test connection

### Phase 2: Domain & Infrastructure

-   [ ] Tạo entity AdminActivityLog
-   [ ] Implement IAdminActivityLogRepository
-   [ ] Implement AdminActivityLogRepository
-   [ ] Add DbSet vào ApplicationDbContext

### Phase 3: Application Layer

-   [ ] Tạo DTOs (ActivityStatsDto, ActiveAdminDto)
-   [ ] Implement IActivityLogService
-   [ ] Implement ActivityLogService

### Phase 4: API Layer

-   [ ] Tạo AdminActivityLogsController
-   [ ] Implement GET /api/admin/activity-logs
-   [ ] Implement GET /api/admin/activity-logs/stats
-   [ ] Implement GET /api/admin/activity-logs/active-admins
-   [ ] Setup Dependency Injection

### Phase 5: Integration

-   [ ] Thêm logging vào UserController
-   [ ] Thêm logging vào PostController
-   [ ] Thêm logging vào BusinessController
-   [ ] Thêm logging vào ReportController
-   [ ] Thêm logging vào SettingsController

### Phase 6: Testing

-   [ ] Test API endpoints với Postman
-   [ ] Test frontend integration
-   [ ] Test performance với large dataset
-   [ ] Test export functionality

---

## 🚀 Quick Start

1. **Chạy migration:**

```bash
dotnet ef migrations add AddAdminActivityLogs
dotnet ef database update
```

2. **Test API:**

```bash
# Get logs
curl -X GET "http://localhost:5297/api/admin/activity-logs?page=1&pageSize=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get stats
curl -X GET "http://localhost:5297/api/admin/activity-logs/stats?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Frontend integration:**

```javascript
// Trong AdminActionsLog.js
setUseMockData(false); // Switch to API mode
```

---

**Status**: 📋 Ready for Implementation
**Estimated Time**: 4-6 hours
**Priority**: High
