-- ================================================
-- RESET ADMIN PASSWORD
-- Reset password cho admin account
-- ================================================

USE ungdungmangxahoiv_2;
GO

PRINT N'';
PRINT N'========================================';
PRINT N'RESET ADMIN PASSWORD';
PRINT N'========================================';
PRINT N'';

DECLARE @Email NVARCHAR(255) = 'kfc09122004@gmail.com';
DECLARE @NewPassword NVARCHAR(255) = 'Admin@123'; -- Mật khẩu mới

-- Password hash for: Admin@123
-- (Bạn cần hash password đúng theo thuật toán backend đang dùng)
-- Tạm thời dùng plaintext để test, SAU ĐÓ PHẢI HASH!

PRINT N'🔍 Tìm account với email: ' + @Email;
PRINT N'';

IF EXISTS (SELECT * FROM Accounts WHERE email = @Email)
BEGIN
    PRINT N'✅ Tìm thấy account!';
    PRINT N'';
    
    -- Show current info
    SELECT 
        account_id,
        email,
        account_type,
        status
    FROM Accounts
    WHERE email = @Email;
    
    PRINT N'';
    PRINT N'⚠️  LƯU Ý: Script này chỉ kiểm tra account';
    PRINT N'   Để reset password, cần:';
    PRINT N'   1. Hash password bằng BCrypt';
    PRINT N'   2. Update vào Accounts table';
    PRINT N'';
    PRINT N'💡 HƯ��NG DẪN RESET PASSWORD:';
    PRINT N'   - Vào backend code';
    PRINT N'   - Tạo endpoint: POST /api/admin/reset-password';
    PRINT N'   - Hoặc dùng Forgot Password feature';
    PRINT N'';
    
    -- Check if account is active
    DECLARE @Status NVARCHAR(50);
    SELECT @Status = status FROM Accounts WHERE email = @Email;
    
    IF @Status != 'active'
    BEGIN
        PRINT N'⚠️  Account status: ' + @Status;
        PRINT N'   Cần kích hoạt account!';
        PRINT N'';
        
        -- Activate account
        UPDATE Accounts
        SET status = 'active'
        WHERE email = @Email;
        
        PRINT N'✅ Đã kích hoạt account!';
    END
    ELSE
    BEGIN
        PRINT N'✅ Account đã active';
    END
END
ELSE
BEGIN
    PRINT N'❌ KHÔNG TÌM THẤY ACCOUNT!';
    PRINT N'';
    PRINT N'💡 TẠO ADMIN ACCOUNT MỚI:';
    PRINT N'   1. Dùng Register API';
    PRINT N'   2. Hoặc insert trực tiếp vào database';
END

PRINT N'';
PRINT N'========================================';
PRINT N'';

-- Show all admin accounts
PRINT N'📋 TẤT CẢ ADMIN ACCOUNTS:';
PRINT N'';

SELECT 
    account_id,
    email,
    account_type,
    status,
    created_at
FROM Accounts
WHERE account_type = 'admin'
ORDER BY created_at DESC;

PRINT N'';
PRINT N'========================================';
PRINT N'✅ HOÀN TẤT!';
PRINT N'========================================';
PRINT N'';

GO
