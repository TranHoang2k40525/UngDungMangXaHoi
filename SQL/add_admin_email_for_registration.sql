-- ==========================================
-- Script: Thêm email Admin vào database để cho phép đăng ký
-- Mục đích: Tạo Account với account_type = 'Admin' và status = 'pending'
--          để email này có thể hoàn tất đăng ký qua endpoint /api/auth/register-admin
-- ==========================================

USE [ungdungmangxahoiv_2]
GO

-- ==========================================
-- Bước 1: Thêm email Admin vào bảng Accounts
-- ==========================================
-- Chỉ những email được thêm vào đây mới có thể đăng ký tài khoản Admin

-- Ví dụ: Thêm email admin@example.com
INSERT INTO [dbo].[Accounts] (
    [email],
    [phone],
    [password_hash],
    [account_type],
    [status],
    [created_at],
    [updated_at]
)
VALUES (
    'admin@example.com',      -- Email được cấp quyền
    'PENDING_TEMP',           -- Số điện thoại tạm (UNIQUE constraint không cho NULL, sẽ cập nhật khi đăng ký)
    '',                       -- Password hash rỗng (sẽ cập nhật khi đăng ký)
    'Admin',                  -- Account type = Admin
    'pending',                -- Status = pending (chưa hoàn tất đăng ký)
    GETUTCDATE(),            -- Created at
    GETUTCDATE()             -- Updated at
)
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
    account_id,
    email,
    account_type,
    status,
    created_at
FROM [dbo].[Accounts]
WHERE account_type = 'Admin' AND status = 'pending'
GO

-- ==========================================
-- Xóa email Admin nếu cần (VD: email đã hết hạn)
-- ==========================================
-- DELETE FROM [dbo].[Accounts] 
-- WHERE email = 'admin@example.com' AND account_type = 'Admin' AND status = 'pending'
-- GO
