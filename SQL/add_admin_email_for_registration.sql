-- ==========================================
-- Script: Thêm email Admin vào database để cho phép đăng ký (RBAC VERSION)
-- Mục đích: Tạo Account với Admin role và status = 'pending'
--          để email này có thể hoàn tất đăng ký qua endpoint /api/auth/register-admin
-- ==========================================

USE [ungdungmangxahoiv_4]
GO

-- ==========================================
-- Bước 1: Lấy Admin role_id
-- ==========================================
DECLARE @AdminRoleId INT;
SELECT @AdminRoleId = role_id FROM Roles WHERE role_name = 'Admin';

IF @AdminRoleId IS NULL
BEGIN
    RAISERROR('Admin role not found in Roles table', 16, 1);
    RETURN;
END

-- ==========================================
-- Bước 2: Thêm email Admin vào bảng Accounts
-- ==========================================
-- Chỉ những email được thêm vào đây mới có thể đăng ký tài khoản Admin

DECLARE @NewAccountId INT;
DECLARE @AdminEmail NVARCHAR(255) = 'admin@example.com';  -- ⭐ THAY ĐỔI EMAIL Ở ĐÂY

-- Kiểm tra email đã tồn tại chưa
IF EXISTS (SELECT 1 FROM Accounts WHERE email = @AdminEmail)
BEGIN
    PRINT 'Email already exists: ' + @AdminEmail;
    RETURN;
END

-- Tạo Account với status pending
INSERT INTO [dbo].[Accounts] (
    [email],
    [phone],
    [password_hash],
    [status],
    [created_at],
    [updated_at]
)
VALUES (
    @AdminEmail,              -- Email được cấp quyền
    'TEMP',                   -- Phone tạm (sẽ update sau)
    '',                       -- Password hash rỗng (sẽ cập nhật khi đăng ký)
    'pending',                -- Status = pending (chưa hoàn tất đăng ký)
    GETUTCDATE(),            -- Created at
    GETUTCDATE()             -- Updated at
);

SET @NewAccountId = SCOPE_IDENTITY();

-- Update phone thành PENDING_accountid (VD: PENDING_7)
UPDATE [dbo].[Accounts] 
SET [phone] = 'PENDING_' + CAST(@NewAccountId AS NVARCHAR)
WHERE [account_id] = @NewAccountId;

SET @NewAccountId = SCOPE_IDENTITY();

-- Kiểm tra INSERT có thành công không
IF @NewAccountId IS NULL
BEGIN
    RAISERROR('Failed to create account', 16, 1);
    RETURN;
END

-- ==========================================
-- Bước 3: Gán Admin role cho account
-- ==========================================
INSERT INTO [dbo].[AccountRoles] (
    [account_id],
    [role_id],
    [is_active],
    [assigned_at],
    [assigned_by],
    [expires_at]
)
VALUES (
    @NewAccountId,           -- Account vừa tạo
    @AdminRoleId,            -- Admin role
    1,                       -- is_active = true
    GETUTCDATE(),           -- assigned_at
    NULL,                    -- assigned_by (NULL = system)
    NULL                     -- expires_at (NULL = không hết hạn)
);

PRINT 'Successfully created admin account: ' + @AdminEmail;
PRINT 'Account ID: ' + CAST(@NewAccountId AS NVARCHAR);
GO

-- ==========================================
-- Cách sử dụng:
-- ==========================================
-- 1. Super Admin chạy script này để thêm email vào database
-- 2. Gửi email cho người được cấp quyền
-- 3. Người đó truy cập trang đăng ký Admin và nhập:
--    - Email: admin@example.com (email đã được thêm)
--    - Full Name, Date of Birth, Phone, Password, Gender
-- 4. Hệ thống sẽ:
--    - Kiểm tra email có tồn tại không
--    - Kiểm tra account_type có phải Admin không
--    - Kiểm tra status có phải pending không
--    - Nếu hợp lệ → Gửi OTP để xác thực
-- 5. Sau khi verify OTP thành công:
--    - Tạo record trong bảng Admins
--    - Chuyển status thành 'active'
--    - Admin có thể đăng nhập

-- ==========================================
-- Kiểm tra email đã thêm:
-- ==========================================
SELECT 
    a.account_id,
    a.email,
    a.status,
    a.created_at,
    r.role_name,
    ar.is_active
FROM [dbo].[Accounts] a
JOIN [dbo].[AccountRoles] ar ON a.account_id = ar.account_id
JOIN [dbo].[Roles] r ON ar.role_id = r.role_id
WHERE a.status = 'pending' AND r.role_name = 'Admin'
ORDER BY a.created_at DESC;
GO

-- ==========================================
-- Xóa email Admin nếu cần (VD: email đã hết hạn)
-- ==========================================
-- DECLARE @EmailToDelete NVARCHAR(255) = 'admin@example.com';
-- DECLARE @AccountIdToDelete INT;
-- SELECT @AccountIdToDelete = account_id FROM Accounts WHERE email = @EmailToDelete;
-- 
-- -- Xóa role assignments trước
-- DELETE FROM AccountRoles WHERE account_id = @AccountIdToDelete;
-- -- Xóa account
-- DELETE FROM Accounts WHERE account_id = @AccountIdToDelete;
-- GO
