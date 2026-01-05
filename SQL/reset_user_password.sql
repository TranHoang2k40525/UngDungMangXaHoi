-- ==========================================
-- Script: Check account và tạo hướng dẫn reset password
-- ==========================================

USE [ungdungmangxahoiv_4]
GO

-- Check account hiện tại
SELECT 
    a.account_id,
    a.email,
    a.phone,
    a.status,
    a.created_at,
    u.full_name,
    u.username,
    r.role_name
FROM Accounts a
LEFT JOIN Users u ON a.account_id = u.account_id
LEFT JOIN AccountRoles ar ON a.account_id = ar.account_id AND ar.is_active = 1
LEFT JOIN Roles r ON ar.role_id = r.role_id
WHERE a.email IN ('hoangzai2k401@gmail.com', 'nguyenbaminhvucma@gmail.com')
ORDER BY a.account_id;

PRINT '=========================================';
PRINT 'HƯỚNG DẪN RESET PASSWORD:';
PRINT '1. Truy cập trang đăng nhập WebUser';
PRINT '2. Click "Quên mật khẩu"';
PRINT '3. Nhập email: hoangzai2k401@gmail.com';
PRINT '4. Check email và nhập OTP';
PRINT '5. Đặt password mới';
PRINT '=========================================';
GO
