-- ==========================================
-- Script: Thêm 2 admin accounts với trạng thái pending để test đăng ký
-- ==========================================

USE [ungdungmangxahoiv_2]
GO

-- ==========================================
-- Bước 1: Insert vào bảng Accounts
-- ==========================================
-- Email 1: vu08092k4@gmail.com
-- Email 2: nguyenbaminhvucma@gamil.com
-- Status: pending (chưa hoàn tất đăng ký)
-- Account Type: Admin

-- Xóa nếu đã tồn tại (để script chạy lại được)
DELETE FROM [dbo].[Admins] WHERE account_id IN (
    SELECT account_id FROM [dbo].[Accounts] 
    WHERE email IN ('vu08092k4@gmail.com', 'nguyenbaminhvucma@gamil.com')
)
GO

DELETE FROM [dbo].[Accounts] 
WHERE email IN ('vu08092k4@gmail.com', 'nguyenbaminhvucma@gamil.com')
GO

-- Insert Account 1: vu08092k4@gmail.com
-- Password tạm (empty hash) - sẽ được cập nhật khi user hoàn tất đăng ký
INSERT INTO [dbo].[Accounts] 
(email, phone, password_hash, account_type, status, created_at, updated_at)
VALUES 
('vu08092k4@gmail.com', '0000000001', '', 'Admin', 'pending', GETDATE(), GETDATE())
GO

-- Insert Account 2: nguyenbaminhvucma@gamil.com
INSERT INTO [dbo].[Accounts] 
(email, phone, password_hash, account_type, status, created_at, updated_at)
VALUES 
('nguyenbaminhvucma@gamil.com', '0000000002', '', 'Admin', 'pending', GETDATE(), GETDATE())
GO

-- ==========================================
-- Bước 2: Insert vào bảng Admins (thông tin cơ bản)
-- ==========================================
-- Lấy account_id vừa tạo và insert vào Admins

DECLARE @account_id_1 INT
DECLARE @account_id_2 INT

SELECT @account_id_1 = account_id FROM [dbo].[Accounts] WHERE email = 'vu08092k4@gmail.com'
SELECT @account_id_2 = account_id FROM [dbo].[Accounts] WHERE email = 'nguyenbaminhvucma@gamil.com'

-- Insert Admin 1
IF @account_id_1 IS NOT NULL
BEGIN
    INSERT INTO [dbo].[Admins] 
    (account_id, full_name, admin_level, is_private)
    VALUES 
    (@account_id_1, 'Admin Vu', 'SuperAdmin', 0)
    PRINT 'Created Admin for vu08092k4@gmail.com'
END

-- Insert Admin 2
IF @account_id_2 IS NOT NULL
BEGIN
    INSERT INTO [dbo].[Admins] 
    (account_id, full_name, admin_level, is_private)
    VALUES 
    (@account_id_2, 'Admin Minh Vu', 'Admin', 0)
    PRINT 'Created Admin for nguyenbaminhvucma@gamil.com'
END
GO

-- ==========================================
-- Bước 3: Kiểm tra kết quả
-- ==========================================
SELECT 
    a.account_id,
    a.email,
    a.phone,
    a.account_type,
    a.status,
    a.password_hash,
    ad.full_name,
    ad.admin_level,
    a.created_at
FROM [dbo].[Accounts] a
LEFT JOIN [dbo].[Admins] ad ON a.account_id = ad.account_id
WHERE a.email IN ('vu08092k4@gmail.com', 'nguyenbaminhvucma@gamil.com')
GO

-- ==========================================
-- LƯU Ý:
-- - 2 accounts này có status = 'pending' và password_hash = NULL
-- - Khi user hoàn tất đăng ký từ frontend, họ sẽ:
--   1. Nhận OTP qua email
--   2. Nhập mật khẩu
--   3. System sẽ update password_hash và status = 'active'
-- ==========================================
