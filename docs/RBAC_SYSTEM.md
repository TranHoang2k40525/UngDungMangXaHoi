# 🔐 RBAC SYSTEM - ROLE-BASED ACCESS CONTROL

## 📋 Tổng quan

Hệ thống RBAC (Role-Based Access Control) mới thay thế cho cách phân quyền cũ dùng `account_type`. Hệ thống mới mang lại:

- ✅ **Linh hoạt**: Dễ dàng thêm roles và permissions mới
- ✅ **Mở rộng**: Hỗ trợ multiple roles cho một account
- ✅ **Tinh chỉnh**: Có thể grant/revoke permissions cho từng account cụ thể
- ✅ **Bảo mật**: Kiểm tra quyền ở nhiều cấp độ
- ✅ **Hiệu năng**: Caching để giảm database queries

---

## 🏗️ Kiến trúc hệ thống

### **5 Tables chính:**

```
1. Roles - Các vai trò trong hệ thống
2. Permissions - Các quyền hạn cụ thể  
3. AccountRoles - Gán roles cho accounts
4. RolePermissions - Gán permissions cho roles
5. AccountPermissions - Override permissions cho accounts cụ thể
```

### **Luồng Authorization:**

```
User Request → JWT Token → Extract AccountId 
    → Get AccountRoles (active & not expired)
    → Get RolePermissions 
    → Get AccountPermissions (grants & revokes)
    → Calculate Final Permissions = (RolePermissions + AccountGrants) - AccountRevokes
    → Check Required Permission → Allow/Deny
```

---

## 🎯 3 Roles mặc định

### **1. User (Priority: 10)**
- Người dùng thông thường
- Quyền cơ bản: tạo posts, comments, stories, messages, search, follow, v.v.

### **2. Business (Priority: 50)**  
- Tài khoản kinh doanh (nâng cấp từ User)
- Có TẤT CẢ quyền của User +
- Quyền đặc biệt: posts.sponsored, posts.pin, business.analytics
- **Có expiration date** (subscription model)

### **3. Admin (Priority: 100)**
- Quản trị viên hệ thống
- Có TẤT CẢ permissions
- Quyền quản lý: ban users, moderate content, view statistics, manage roles

---

## 📜 42 Permissions được định nghĩa

### **Posts Module**
- `posts.create` - Tạo bài viết
- `posts.edit` - Sửa bài viết của mình
- `posts.delete` - Xóa bài viết của mình
- `posts.view` - Xem bài viết
- `posts.moderate` - Kiểm duyệt bài viết (Admin)
- `posts.sponsored` - Đăng bài tài trợ (Business)
- `posts.pin` - Ghim bài viết (Business)

### **Comments Module**
- `comments.create` - Tạo bình luận
- `comments.edit` - Sửa bình luận
- `comments.delete` - Xóa bình luận
- `comments.moderate` - Kiểm duyệt bình luận (Admin)
- `comments.react` - React bình luận

### **Stories Module**
- `stories.create` - Tạo story
- `stories.view` - Xem story
- `stories.delete` - Xóa story

### **Messages Module**
- `messages.send` - Gửi tin nhắn
- `messages.read` - Đọc tin nhắn
- `messages.delete` - Xóa tin nhắn

### **Group Chat Module**
- `groupchat.create` - Tạo nhóm chat
- `groupchat.send` - Gửi tin nhắn nhóm
- `groupchat.manage` - Quản lý nhóm

### **Search Module**
- `search.use` - Tìm kiếm
- `search.history` - Xem lịch sử tìm kiếm

### **Profile Module**
- `profile.view` - Xem profile
- `profile.edit` - Sửa profile
- `profile.follow` - Follow người khác
- `profile.block` - Chặn người khác

### **Notifications Module**
- `notifications.view` - Xem thông báo
- `notifications.manage` - Quản lý cài đặt thông báo

### **Business Module**
- `business.upgrade` - Yêu cầu nâng cấp Business
- `business.analytics` - Xem analytics (Business)
- `business.payment` - Thanh toán (Business)

### **Admin Module**
- `admin.dashboard` - Xem dashboard
- `admin.users.view` - Xem danh sách users
- `admin.users.edit` - Sửa thông tin users
- `admin.users.ban` - Ban/unban users
- `admin.users.delete` - Xóa users
- `admin.content.moderate` - Kiểm duyệt nội dung
- `admin.reports.view` - Xem báo cáo
- `admin.reports.resolve` - Xử lý báo cáo
- `admin.business.verify` - Duyệt Business
- `admin.statistics.view` - Xem thống kê
- `admin.roles.manage` - Quản lý roles

---

## 🚀 Migration Guide

### **Bước 1: Chạy SQL scripts theo thứ tự**

```sql
-- 1. Tạo tables RBAC
sqlcmd -i SQL/create_rbac_tables.sql

-- 2. Seed roles và permissions
sqlcmd -i SQL/seed_rbac_data.sql

-- 3. Migrate dữ liệu từ account_type sang RBAC
sqlcmd -i SQL/migrate_account_type_to_rbac.sql
```

### **Bước 2: Update Program.cs**

```csharp
// Add RBAC services
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IAuthorizationService, AuthorizationService>();
builder.Services.AddScoped<RbacJwtTokenService>();

// Optional: Keep old JWT service for backward compatibility
builder.Services.AddScoped<JwtTokenService>();
```

### **Bước 3: Update Controllers**

**CŨ (dùng Policy):**
```csharp
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
```

**MỚI (dùng RBAC Attributes):**
```csharp
[RequireRole("Admin")]
public class AdminController : ControllerBase
```

hoặc dùng permissions:

```csharp
[RequirePermission("admin.dashboard", "admin.users.view")]
public class AdminController : ControllerBase
```

### **Bước 4: Update AuthService để dùng RbacJwtTokenService**

```csharp
// Old
public async Task<(string AccessToken, string RefreshToken)> DangNhapAsync(...)
{
    var accessToken = _jwtTokenService.GenerateAccessToken(account);
    var refreshToken = _jwtTokenService.GenerateRefreshToken(account);
    // ...
}

// New
public async Task<(string AccessToken, string RefreshToken)> DangNhapAsync(...)
{
    var accessToken = await _rbacJwtTokenService.GenerateAccessTokenAsync(account);
    var refreshToken = await _rbacJwtTokenService.GenerateRefreshTokenAsync(account);
    // ...
}
```

---

## 💻 Sử dụng RBAC trong Code

### **1. Dùng Attributes trên Controller/Action**

```csharp
// Yêu cầu role Admin
[RequireRole("Admin")]
public async Task<IActionResult> GetDashboard() { }

// Yêu cầu một trong các roles
[RequireRole("Admin", "Business")]
public async Task<IActionResult> GetAnalytics() { }

// Yêu cầu permission cụ thể
[RequirePermission("posts.create")]
public async Task<IActionResult> CreatePost() { }

// Yêu cầu một trong các permissions
[RequirePermission("posts.edit", "posts.moderate")]
public async Task<IActionResult> EditPost(int postId) { }

// Yêu cầu TẤT CẢ permissions
[RequireAllPermissions("admin.users.view", "admin.users.edit")]
public async Task<IActionResult> EditUser(int userId) { }
```

### **2. Check quyền trong code (runtime)**

```csharp
public class PostsController : ControllerBase
{
    private readonly IAuthorizationService _authService;
    
    public async Task<IActionResult> EditPost(int postId)
    {
        var accountId = User.GetAccountId();
        
        // Check if user can edit posts
        var canEdit = await _authService.HasPermissionAsync(accountId.Value, "posts.edit");
        if (!canEdit)
            return Forbid();
        
        // Check if user is Admin (can edit any post)
        var isAdmin = await _authService.HasRoleAsync(accountId.Value, "Admin");
        
        // Business logic...
    }
}
```

### **3. Extension methods**

```csharp
// Get account ID
var accountId = User.GetAccountId();

// Check permission
var canCreate = await User.HasPermissionAsync(_authService, "posts.create");

// Check any permission
var canManage = await User.HasAnyPermissionAsync(_authService, 
    "posts.moderate", "admin.content.moderate");

// Check role
var isAdmin = await User.HasRoleAsync(_authService, "Admin");

// Check any role
var isPrivileged = await User.HasAnyRoleAsync(_authService, "Admin", "Business");
```

---

## 🔧 Quản lý Roles và Permissions

### **Assign role cho user**

```csharp
// Assign User role (permanent)
await _accountRoleRepo.AssignRoleAsync(
    accountId: userId,
    roleId: userRoleId,
    expiresAt: null,
    assignedBy: "SYSTEM"
);

// Assign Business role (30 days)
await _accountRoleRepo.AssignRoleAsync(
    accountId: userId,
    roleId: businessRoleId,
    expiresAt: DateTime.UtcNow.AddDays(30),
    assignedBy: $"Admin:{adminId}"
);
```

### **Grant/Revoke permission cho account cụ thể**

```csharp
// Grant special permission to a user
await _accountPermissionRepo.GrantPermissionAsync(
    accountId: userId,
    permissionId: specialPermissionId,
    expiresAt: DateTime.UtcNow.AddDays(7),
    assignedBy: $"Admin:{adminId}",
    reason: "Promotion event"
);

// Revoke permission from a user
await _accountPermissionRepo.RevokePermissionAsync(
    accountId: userId,
    permissionId: dangerousPermissionId,
    assignedBy: $"Admin:{adminId}",
    reason: "Policy violation"
);
```

---

## 🔄 Backward Compatibility

Hệ thống mới **HOÀN TOÀN tương thích ngược**:

1. **`account_type` column vẫn giữ** (marked as `[Obsolete]`)
2. **JWT token vẫn chứa `account_type` claim** cho old clients
3. **Old Policies vẫn hoạt động** (AdminOnly, UserOnly, BusinessOnly)
4. **Migration script giữ nguyên tất cả quyền hiện tại**

### **Mapping account_type → RBAC:**

```
account_type = 'Admin'    → Role: Admin
account_type = 'User'     → Role: User
account_type = 'Business' → Roles: User + Business (with expiration)
```

---

## ⚡ Performance & Caching

- **Memory Cache** cho permissions và roles (15 minutes TTL)
- Cache keys: `permissions_{accountId}`, `roles_{accountId}`, `primary_role_{accountId}`
- Auto clear cache khi có thay đổi roles/permissions
- JWT token chứa top 20 permissions để giảm database calls

---

## 🧪 Testing RBAC

### **Test cases cần check:**

1. ✅ Admin có ALL permissions
2. ✅ User có basic permissions
3. ✅ Business có User permissions + Business permissions
4. ✅ Expired Business role tự động deactivate
5. ✅ Account permissions override role permissions
6. ✅ JWT token chứa đúng roles và permissions
7. ✅ Authorization attributes hoạt động đúng
8. ✅ Backward compatibility với old clients

---

## 📊 Monitoring & Maintenance

### **Background jobs cần thiết:**

```csharp
// Job 1: Deactivate expired Business roles
public async Task DeactivateExpiredBusinessRoles()
{
    var count = await _accountRoleRepo.DeactivateExpiredRolesAsync();
    _logger.LogInformation($"Deactivated {count} expired Business roles");
}

// Job 2: Remove expired account permissions
public async Task RemoveExpiredPermissions()
{
    var count = await _accountPermissionRepo.RemoveExpiredPermissionsAsync();
    _logger.LogInformation($"Removed {count} expired account permissions");
}
```

### **Chạy jobs:**
- Mỗi ngày 1 lần vào lúc 00:00 UTC
- Hoặc sử dụng Hangfire/Quartz.NET

---

## 📞 Support & Next Steps

### **Sau khi migration:**

1. Test thoroughly trên staging environment
2. Monitor logs cho authorization errors
3. Update documentation cho team
4. Train team về cách sử dụng RBAC
5. Gradually migrate old code sang dùng RBAC attributes
6. Sau 2-3 tháng ổn định, có thể xóa `account_type` column (optional)

### **Future enhancements:**

- Admin UI để quản lý roles và permissions
- Permission groups (categories)
- Resource-based authorization (e.g., can edit THIS specific post)
- Audit logs cho role/permission changes
- API endpoints để quản lý RBAC từ frontend

---

## ✅ Checklist Migration

- [ ] Chạy SQL scripts: create_rbac_tables.sql
- [ ] Chạy SQL scripts: seed_rbac_data.sql  
- [ ] Chạy SQL scripts: migrate_account_type_to_rbac.sql
- [ ] Verify data migration thành công
- [ ] Update Program.cs để register RBAC services
- [ ] Update AuthService để dùng RbacJwtTokenService
- [ ] Update Controllers để dùng RBAC attributes
- [ ] Test tất cả API endpoints
- [ ] Update frontend clients (if needed)
- [ ] Deploy lên staging
- [ ] Monitor và fix issues
- [ ] Deploy lên production
- [ ] Setup background jobs
- [ ] Update documentation

---

**Prepared by:** AI Migration Team  
**Date:** 2025-01-01  
**Version:** 1.0.0
