# Admin Registration Flow (RBAC Version)

## Tổng quan

Sau khi chuyển sang hệ thống RBAC, việc tạo Admin account đã thay đổi hoàn toàn. Document này mô tả flow mới.

## Flow đăng ký Admin

### 1. Super Admin tạo pending account

**Bước 1:** Super Admin chạy SQL script để tạo account với Admin role (status = pending):

```sql
-- File: SQL/add_admin_email_for_registration.sql

DECLARE @AdminEmail NVARCHAR(255) = 'newemail@example.com';  -- ⭐ THAY EMAIL
-- Script sẽ tự động:
-- 1. Tạo Account với status = 'pending'
-- 2. Gán Admin role vào AccountRoles table
```

**Quan trọng:**
- Account được tạo với `status = 'pending'`
- Account đã được GÁN Admin role trong bảng `AccountRoles`
- `password_hash` để rỗng (user sẽ tạo khi đăng ký)
- `phone` có thể NULL (user sẽ nhập khi đăng ký)

### 2. User hoàn tất đăng ký

**Bước 2:** User truy cập `/register` trên WebAdmin và nhập:
- Email (phải match với email đã được thêm vào database)
- Họ tên đầy đủ
- Ngày sinh
- Số điện thoại (optional)
- Mật khẩu
- Giới tính

**API Endpoint:** `POST /api/auth/register-admin`

**Backend xử lý:**
```csharp
// 1. Check email có trong database không
var existingAccount = await _accountRepository.GetByEmailAsync(email);
if (existingAccount == null) 
    return BadRequest("Email chưa được cấp quyền");

// 2. Check account có Admin role không (RBAC)
var hasAdminRole = await _accountRoleRepository.HasRoleAsync(account_id, "Admin");
if (!hasAdminRole)
    return BadRequest("Email không có quyền Admin");

// 3. Check status phải là pending
if (existingAccount.status != "pending")
    return BadRequest("Email đã được đăng ký");

// 4. Update password và thông tin khác
// 5. Tạo Admin record (bảng Admins)
// 6. Gửi OTP qua email
```

### 3. Verify OTP

**Bước 3:** User nhập OTP nhận được từ email

**API Endpoint:** `POST /api/auth/verify-admin-otp`

**Backend xử lý:**
```csharp
// 1. Verify OTP
// 2. Chuyển account.status = "active"
// 3. Return access token + refresh token
// 4. User đăng nhập thành công
```

**Lưu ý:** Admin role ĐÃ ĐƯỢC GÁN từ bước 1 (SQL script), không cần gán lại trong verify OTP.

## Kiểm tra account

### Xem danh sách pending admin accounts:

```sql
SELECT 
    a.account_id,
    a.email,
    a.status,
    a.created_at,
    r.role_name,
    ar.is_active
FROM Accounts a
JOIN AccountRoles ar ON a.account_id = ar.account_id
JOIN Roles r ON ar.role_id = r.role_id
WHERE a.status = 'pending' AND r.role_name = 'Admin'
ORDER BY a.created_at DESC;
```

### Xem admin accounts đã active:

```sql
SELECT 
    a.account_id,
    a.email,
    a.status,
    adm.full_name,
    adm.admin_level,
    r.role_name
FROM Accounts a
JOIN AccountRoles ar ON a.account_id = ar.account_id
JOIN Roles r ON ar.role_id = r.role_id
JOIN Admins adm ON a.account_id = adm.account_id
WHERE a.status = 'active' AND r.role_name = 'Admin'
ORDER BY a.created_at DESC;
```

## Xóa pending admin account

Nếu admin account không được sử dụng trong thời gian dài, có thể xóa:

```sql
DECLARE @EmailToDelete NVARCHAR(255) = 'unused@example.com';
DECLARE @AccountIdToDelete INT;

SELECT @AccountIdToDelete = account_id FROM Accounts WHERE email = @EmailToDelete;

-- Xóa role assignments
DELETE FROM AccountRoles WHERE account_id = @AccountIdToDelete;

-- Xóa account
DELETE FROM Accounts WHERE account_id = @AccountIdToDelete;

PRINT 'Deleted admin account: ' + @EmailToDelete;
```

## So sánh với cách cũ

### Trước (account_type):
```sql
INSERT INTO Accounts (email, password_hash, account_type, status)
VALUES ('admin@example.com', '', 'Admin', 'pending');
```

### Sau (RBAC):
```sql
-- 1. Tạo account
INSERT INTO Accounts (email, password_hash, status)
VALUES ('admin@example.com', '', 'pending');

-- 2. Gán Admin role
INSERT INTO AccountRoles (account_id, role_id, is_active)
VALUES (@NewAccountId, @AdminRoleId, 1);
```

## Troubleshooting

### Lỗi: "Email chưa được cấp quyền Admin"
- **Nguyên nhân:** Email chưa được thêm vào database HOẶC chưa được gán Admin role
- **Giải pháp:** Chạy script `add_admin_email_for_registration.sql` với email đúng

### Lỗi: "Email đã được đăng ký"
- **Nguyên nhân:** Account.status không phải 'pending' (có thể đã active hoặc expired)
- **Giải pháp:** Xóa account cũ và tạo lại

### Lỗi: "OTP không hợp lệ"
- **Nguyên nhân:** OTP đã hết hạn (1 phút) hoặc nhập sai
- **Giải pháp:** Quay lại bước đăng ký để nhận OTP mới

## Security Notes

1. **Email whitelist:** Chỉ email được thêm vào database bởi Super Admin mới có thể đăng ký admin
2. **RBAC check:** Backend kiểm tra Admin role trong AccountRoles table
3. **OTP expiration:** OTP hết hạn sau 1 phút
4. **Rate limiting:** Tối đa 5 lần thử OTP sai, sau đó phải đăng ký lại
5. **Status tracking:** Chỉ account có status = 'pending' mới được phép hoàn tất đăng ký

## Frontend Changes

WebAdmin frontend không cần thay đổi gì. Flow vẫn như cũ:
1. User điền form đăng ký → `POST /api/auth/register-admin`
2. User nhận OTP và verify → `POST /api/auth/verify-admin-otp`
3. Đăng nhập thành công với Admin role
