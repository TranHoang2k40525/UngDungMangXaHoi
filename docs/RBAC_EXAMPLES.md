# 📝 VÍ DỤ CẬP NHẬT CONTROLLERS

## Ví dụ 1: AdminController - Sử dụng RequireRole

### CŨ (dùng Policy):
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]  // ❌ Old way
public class AdminController : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        // ...
    }
    
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        // ...
    }
}
```

### MỚI (dùng RBAC):
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Presentation.WebAPI.Attributes;  // ✅ New import

[ApiController]
[Route("api/admin")]
[Authorize]  // ✅ Still need Authorize for authentication
[RequireRole("Admin")]  // ✅ New RBAC attribute
public class AdminController : ControllerBase
{
    [HttpGet("dashboard")]
    [RequirePermission("admin.dashboard")]  // ✅ More granular control
    public async Task<IActionResult> GetDashboard()
    {
        // ...
    }
    
    [HttpGet("users")]
    [RequirePermission("admin.users.view")]  // ✅ Check specific permission
    public async Task<IActionResult> GetUsers()
    {
        // ...
    }
    
    [HttpDelete("users/{userId}")]
    [RequirePermission("admin.users.delete")]  // ✅ Different permission
    public async Task<IActionResult> DeleteUser(int userId)
    {
        // ...
    }
}
```

---

## Ví dụ 2: PostsController - Multiple Permissions

### CŨ:
```csharp
[ApiController]
[Route("api/posts")]
[Authorize(Policy = "UserOnly")]
public class PostsController : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
    {
        // Manual check for Business sponsored post
        var accountType = User.FindFirst("account_type")?.Value;
        if (request.IsSponsored && accountType != "Business")
        {
            return Forbid("Only Business accounts can create sponsored posts");
        }
        // ...
    }
}
```

### MỚI:
```csharp
[ApiController]
[Route("api/posts")]
[Authorize]
[RequireRole("User", "Business", "Admin")]  // ✅ Any of these roles
public class PostsController : ControllerBase
{
    private readonly IAuthorizationService _authService;
    
    public PostsController(IAuthorizationService authService)
    {
        _authService = authService;
    }
    
    [HttpPost]
    [RequirePermission("posts.create")]  // ✅ Basic permission
    public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
    {
        var accountId = User.GetAccountId();
        
        // Runtime check for sponsored posts
        if (request.IsSponsored)
        {
            var canSponsored = await _authService.HasPermissionAsync(
                accountId.Value, 
                "posts.sponsored"
            );
            
            if (!canSponsored)
            {
                return Forbid("You need Business account to create sponsored posts");
            }
        }
        
        // ...
    }
    
    [HttpPut("{postId}")]
    [RequirePermission("posts.edit", "posts.moderate")]  // ✅ Owner OR Admin
    public async Task<IActionResult> EditPost(int postId, [FromBody] EditPostRequest request)
    {
        var accountId = User.GetAccountId();
        
        // Check if user is Admin (can edit any post)
        var isAdmin = await _authService.HasRoleAsync(accountId.Value, "Admin");
        
        if (!isAdmin)
        {
            // Check if user owns the post
            var post = await _postRepo.GetByIdAsync(postId);
            if (post?.User?.account_id != accountId)
            {
                return Forbid("You can only edit your own posts");
            }
        }
        
        // ...
    }
}
```

---

## Ví dụ 3: BusinessUpgradeController

### MỚI:
```csharp
[ApiController]
[Route("api/business")]
[Authorize]
public class BusinessUpgradeController : ControllerBase
{
    private readonly IBusinessUpgradeService _businessService;
    private readonly IAccountRoleRepository _accountRoleRepo;
    private readonly IRoleRepository _roleRepo;
    private readonly IAuthorizationService _authService;
    
    [HttpPost("upgrade")]
    [RequireRole("User")]  // ✅ Only User can upgrade (not Admin, not already Business)
    [RequirePermission("business.upgrade")]
    public async Task<IActionResult> RequestUpgrade([FromBody] BusinessUpgradeRequest request)
    {
        var accountId = User.GetAccountId();
        
        // Check if already has Business role
        var hasBusiness = await _authService.HasRoleAsync(accountId.Value, "Business");
        if (hasBusiness)
        {
            return BadRequest("You already have a Business account");
        }
        
        // Process payment and upgrade
        var result = await _businessService.ProcessUpgradeAsync(accountId.Value, request);
        
        if (result.Success)
        {
            // Assign Business role (30 days)
            var businessRole = await _roleRepo.GetByNameAsync("Business");
            await _accountRoleRepo.AssignRoleAsync(
                accountId.Value,
                businessRole.role_id,
                expiresAt: DateTime.UtcNow.AddDays(30),
                assignedBy: "SYSTEM_PAYMENT"
            );
            
            // Clear cache
            _authService.ClearCache(accountId.Value);
        }
        
        return Ok(result);
    }
    
    [HttpGet("status")]
    [RequireRole("Business")]  // ✅ Only Business accounts
    public async Task<IActionResult> GetBusinessStatus()
    {
        var accountId = User.GetAccountId();
        
        // Get Business role expiration
        var businessRoles = await _accountRoleRepo.GetAccountRolesAsync(accountId.Value);
        var businessRole = businessRoles.FirstOrDefault(ar => ar.Role.role_name == "Business");
        
        return Ok(new
        {
            IsActive = businessRole?.is_active ?? false,
            ExpiresAt = businessRole?.expires_at,
            DaysRemaining = businessRole?.expires_at.HasValue 
                ? (businessRole.expires_at.Value - DateTime.UtcNow).Days 
                : (int?)null
        });
    }
    
    [HttpGet("analytics")]
    [RequirePermission("business.analytics")]  // ✅ Business-only feature
    public async Task<IActionResult> GetAnalytics()
    {
        var accountId = User.GetAccountId();
        var analytics = await _businessService.GetAnalyticsAsync(accountId.Value);
        return Ok(analytics);
    }
}
```

---

## Ví dụ 4: Kiểm tra quyền trong Service Layer

```csharp
public class PostService
{
    private readonly IAuthorizationService _authService;
    private readonly IPostRepository _postRepo;
    
    public async Task<Post> CreatePostAsync(int accountId, CreatePostDto dto)
    {
        // Check permission at service level (defensive programming)
        var canCreate = await _authService.HasPermissionAsync(accountId, "posts.create");
        if (!canCreate)
        {
            throw new UnauthorizedAccessException("You don't have permission to create posts");
        }
        
        // Check sponsored post permission
        if (dto.IsSponsored)
        {
            var canSponsored = await _authService.HasPermissionAsync(accountId, "posts.sponsored");
            if (!canSponsored)
            {
                throw new UnauthorizedAccessException("Only Business accounts can create sponsored posts");
            }
        }
        
        // Create post
        var post = new Post
        {
            user_id = accountId,
            caption = dto.Caption,
            is_sponsored = dto.IsSponsored,
            // ...
        };
        
        return await _postRepo.CreateAsync(post);
    }
    
    public async Task<bool> CanEditPostAsync(int accountId, int postId)
    {
        // Check if user is Admin (can edit any post)
        var isAdmin = await _authService.HasRoleAsync(accountId, "Admin");
        if (isAdmin) return true;
        
        // Check if user has moderate permission
        var canModerate = await _authService.HasPermissionAsync(accountId, "posts.moderate");
        if (canModerate) return true;
        
        // Check if user owns the post
        var post = await _postRepo.GetByIdAsync(postId);
        if (post?.user_id == accountId)
        {
            // Check edit permission
            return await _authService.HasPermissionAsync(accountId, "posts.edit");
        }
        
        return false;
    }
}
```

---

## Ví dụ 5: Middleware kiểm tra quyền theo route

```csharp
public class RbacMiddleware
{
    private readonly RequestDelegate _next;
    
    public RbacMiddleware(RequestDelegate next)
    {
        _next = next;
    }
    
    public async Task InvokeAsync(HttpContext context, IAuthorizationService authService)
    {
        var path = context.Request.Path.Value?.ToLower() ?? string.Empty;
        
        if (!context.User.Identity?.IsAuthenticated ?? true)
        {
            await _next(context);
            return;
        }
        
        var accountId = context.User.GetAccountId();
        if (accountId == null)
        {
            context.Response.StatusCode = 401;
            return;
        }
        
        // Route-based authorization
        if (path.StartsWith("/api/admin"))
        {
            var isAdmin = await authService.HasRoleAsync(accountId.Value, "Admin");
            if (!isAdmin)
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new { error = "Admin access required" });
                return;
            }
        }
        else if (path.StartsWith("/api/business/analytics"))
        {
            var canAnalytics = await authService.HasPermissionAsync(accountId.Value, "business.analytics");
            if (!canAnalytics)
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new { error = "Business account required" });
                return;
            }
        }
        
        await _next(context);
    }
}
```

---

## Ví dụ 6: Testing RBAC

```csharp
[TestClass]
public class RbacAuthorizationTests
{
    private IAuthorizationService _authService;
    private AppDbContext _context;
    
    [TestInitialize]
    public void Setup()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("TestDb")
            .Options;
        _context = new AppDbContext(options);
        
        var cache = new MemoryCache(new MemoryCacheOptions());
        _authService = new AuthorizationService(_context, cache);
        
        // Seed test data
        SeedTestData();
    }
    
    [TestMethod]
    public async Task User_ShouldHave_CreatePostPermission()
    {
        // Arrange
        var userId = 1; // Test user
        
        // Act
        var hasPermission = await _authService.HasPermissionAsync(userId, "posts.create");
        
        // Assert
        Assert.IsTrue(hasPermission);
    }
    
    [TestMethod]
    public async Task User_ShouldNotHave_AdminPermissions()
    {
        // Arrange
        var userId = 1; // Test user
        
        // Act
        var hasPermission = await _authService.HasPermissionAsync(userId, "admin.users.ban");
        
        // Assert
        Assert.IsFalse(hasPermission);
    }
    
    [TestMethod]
    public async Task Business_ShouldHave_SponsoredPostPermission()
    {
        // Arrange
        var businessId = 2; // Test business account
        
        // Act
        var hasPermission = await _authService.HasPermissionAsync(businessId, "posts.sponsored");
        
        // Assert
        Assert.IsTrue(hasPermission);
    }
    
    [TestMethod]
    public async Task Admin_ShouldHave_AllPermissions()
    {
        // Arrange
        var adminId = 3; // Test admin
        
        // Act
        var allPermissions = await _authService.GetAccountPermissionsAsync(adminId);
        
        // Assert
        Assert.IsTrue(allPermissions.Count() >= 40); // Should have all 42 permissions
        Assert.IsTrue(allPermissions.Contains("posts.create"));
        Assert.IsTrue(allPermissions.Contains("admin.users.ban"));
        Assert.IsTrue(allPermissions.Contains("business.analytics"));
    }
}
```

---

## Best Practices

### ✅ DO:
1. Sử dụng `[RequirePermission]` cho actions cụ thể
2. Sử dụng `[RequireRole]` cho toàn bộ controller
3. Check permissions ở cả Controller và Service layer
4. Cache permissions results khi có thể
5. Log authorization failures để audit
6. Clear cache sau khi thay đổi roles/permissions

### ❌ DON'T:
1. Không hard-code role names khắp nơi
2. Không skip authorization checks ở Service layer
3. Không quên clear cache sau role changes
4. Không check permissions trong loop (performance issue)
5. Không expose sensitive data trong authorization errors

---

**Happy Coding! 🚀**
