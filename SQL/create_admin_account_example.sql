-- ==========================================
-- EXAMPLE: Tạo Admin Account mới
-- Sử dụng script này để tạo admin account test
-- ==========================================

USE [ungdungmangxahoiv_4]
GO

-- ==========================================
-- ⭐⭐⭐ CẤU HÌNH: SỬA EMAIL Ở ĐÂY ⭐⭐⭐
-- ==========================================
DECLARE @AdminEmail NVARCHAR(255) = 'testadmin@example.com';
-- Ví dụ: 'admin@company.com', 'hoangadmin@gmail.com', etc.
-- ==========================================

-- Lấy Admin role_id
DECLARE @AdminRoleId INT;
SELECT @AdminRoleId = role_id FROM Roles WHERE role_name = 'Admin';

IF @AdminRoleId IS NULL
BEGIN
    PRINT 'ERROR: Admin role not found!';
    RETURN;
END

-- Kiểm tra email đã tồn tại chưa
IF EXISTS (SELECT 1 FROM Accounts WHERE email = @AdminEmail)
BEGIN
    PRINT 'ERROR: Email already exists: ' + @AdminEmail;
    RETURN;
END

-- Tạo Account với phone placeholder tạm
DECLARE @NewAccountId INT;

INSERT INTO Accounts (email, phone, password_hash, status, created_at, updated_at)
VALUES (@AdminEmail, 'TEMP', '', 'pending', GETUTCDATE(), GETUTCDATE());

SET @NewAccountId = SCOPE_IDENTITY();

-- Update phone thành PENDING_accountid (VD: PENDING_7)
UPDATE Accounts 
SET phone = 'PENDING_' + CAST(@NewAccountId AS NVARCHAR) 
WHERE account_id = @NewAccountId;

IF @NewAccountId IS NULL
BEGIN
    PRINT '❌ ERROR: Failed to create account';
    RETURN;
END

-- Gán Admin role
INSERT INTO AccountRoles (account_id, role_id, is_active, assigned_at, assigned_by, expires_at)
VALUES (@NewAccountId, @AdminRoleId, 1, GETUTCDATE(), NULL, NULL);

PRINT '✅ SUCCESS: Created admin account';
PRINT 'Email: ' + @AdminEmail;
PRINT 'Account ID: ' + CAST(@NewAccountId AS NVARCHAR);
PRINT '';
PRINT 'Next steps:';
PRINT '1. Gửi email ' + @AdminEmail + ' cho người cần đăng ký';
PRINT '2. Họ truy cập WebAdmin và hoàn tất đăng ký';
PRINT '3. Sau khi verify OTP, họ có thể đăng nhập';
GO

-- Xem kết quả
SELECT 
    a.account_id,
    a.email,
    a.status,
    r.role_name,
    ar.is_active,
    a.created_at
FROM Accounts a
JOIN AccountRoles ar ON a.account_id = ar.account_id
JOIN Roles r ON ar.role_id = r.role_id
WHERE a.status = 'pending' AND r.role_name = 'Admin'
ORDER BY a.created_at DESC;
