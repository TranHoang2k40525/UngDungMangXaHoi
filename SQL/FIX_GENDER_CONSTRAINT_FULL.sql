-- ============================================================================
-- FIX GENDER CHECK CONSTRAINT - FULL VERSION
-- Mục đích: Fix lỗi "INSERT statement conflicted with CHECK constraint"
-- Database: ungdungmangxahoiv_2
-- Table: Users
-- Column: gender
-- ============================================================================

USE ungdungmangxahoiv_2;
GO

PRINT '============================================================================';
PRINT 'BƯỚC 1: KIỂM TRA CONSTRAINT HIỆN TẠI';
PRINT '============================================================================';
PRINT '';

-- Kiểm tra constraint đang tồn tại
SELECT 
    OBJECT_NAME(parent_object_id) AS [Tên Bảng],
    name AS [Tên Constraint],
    definition AS [Định nghĩa],
    is_disabled AS [Bị Vô Hiệu Hóa]
FROM sys.check_constraints
WHERE OBJECT_NAME(parent_object_id) = 'Users' 
  AND name LIKE '%gender%';
GO

PRINT '';
PRINT '============================================================================';
PRINT 'BƯỚC 2: SAO LƯU DỮ LIỆU (TÙY CHỌN)';
PRINT '============================================================================';
PRINT '';

-- Kiểm tra số lượng user hiện tại
SELECT 
    COUNT(*) AS [Tổng số Users],
    COUNT(CASE WHEN gender IS NULL THEN 1 END) AS [Gender = NULL],
    COUNT(CASE WHEN gender IS NOT NULL THEN 1 END) AS [Có Gender]
FROM Users;
GO

-- Kiểm tra các giá trị gender hiện có
SELECT 
    gender AS [Giá Trị Gender],
    COUNT(*) AS [Số Lượng]
FROM Users
GROUP BY gender
ORDER BY COUNT(*) DESC;
GO

PRINT '';
PRINT '============================================================================';
PRINT 'BƯỚC 3: XÓA CONSTRAINT CŨ';
PRINT '============================================================================';
PRINT '';

-- Kiểm tra xem constraint có tồn tại không trước khi xóa
IF EXISTS (
    SELECT 1 
    FROM sys.check_constraints 
    WHERE name = 'CK__Users__gender__412EB0B6' 
      AND OBJECT_NAME(parent_object_id) = 'Users'
)
BEGIN
    PRINT 'Đang xóa constraint cũ: CK__Users__gender__412EB0B6...';
    
    ALTER TABLE Users
    DROP CONSTRAINT CK__Users__gender__412EB0B6;
    
    PRINT '✅ Đã xóa constraint cũ thành công!';
END
ELSE
BEGIN
    PRINT '⚠️ Constraint CK__Users__gender__412EB0B6 không tồn tại. Bỏ qua bước này.';
END
GO

PRINT '';
PRINT '============================================================================';
PRINT 'BƯỚC 4: TẠO CONSTRAINT MỚI (CHO PHÉP NULL)';
PRINT '============================================================================';
PRINT '';

-- Kiểm tra xem constraint mới đã tồn tại chưa
IF EXISTS (
    SELECT 1 
    FROM sys.check_constraints 
    WHERE name = 'CK_Users_Gender' 
      AND OBJECT_NAME(parent_object_id) = 'Users'
)
BEGIN
    PRINT '⚠️ Constraint CK_Users_Gender đã tồn tại. Xóa trước khi tạo mới...';
    
    ALTER TABLE Users
    DROP CONSTRAINT CK_Users_Gender;
    
    PRINT '✅ Đã xóa constraint cũ.';
END
GO

-- Tạo constraint mới cho phép NULL hoặc các giá trị hợp lệ
PRINT 'Đang tạo constraint mới: CK_Users_Gender...';

ALTER TABLE Users
ADD CONSTRAINT CK_Users_Gender 
CHECK (
    gender IS NULL 
    OR gender IN (
        'Male',      -- Nam (English)
        'Female',    -- Nữ (English)
        'Other',     -- Khác (English)
        'Nam',       -- Nam (Vietnamese)
        'Nữ',        -- Nữ (Vietnamese)
        N'Nữ',       -- Nữ (Unicode Vietnamese)
        'Khác',      -- Khác (Vietnamese)
        N'Khác'      -- Khác (Unicode Vietnamese)
    )
);
GO

PRINT '✅ Đã tạo constraint mới thành công!';
PRINT '';

PRINT '============================================================================';
PRINT 'BƯỚC 5: KIỂM TRA KẾT QUẢ';
PRINT '============================================================================';
PRINT '';

-- Kiểm tra constraint mới
SELECT 
    OBJECT_NAME(parent_object_id) AS [Tên Bảng],
    name AS [Tên Constraint],
    definition AS [Định Nghĩa],
    is_disabled AS [Bị Vô Hiệu Hóa],
    create_date AS [Ngày Tạo]
FROM sys.check_constraints
WHERE OBJECT_NAME(parent_object_id) = 'Users' 
  AND name = 'CK_Users_Gender';
GO

PRINT '';
PRINT '============================================================================';
PRINT 'BƯỚC 6: TEST CONSTRAINT MỚI';
PRINT '============================================================================';
PRINT '';

-- Test 1: Insert với gender = NULL (phải thành công)
PRINT 'Test 1: Insert với gender = NULL...';
BEGIN TRY
    BEGIN TRANSACTION;
    
    -- Tạo account test
    DECLARE @TestAccountId INT;
    INSERT INTO Accounts (account_type, email, password_hash, status, created_at, updated_at)
    VALUES ('User', 'test_null_gender@test.com', 'hash123', 'active', GETDATE(), GETDATE());
    
    SET @TestAccountId = SCOPE_IDENTITY();
    
    -- Tạo user với gender = NULL
    INSERT INTO Users (account_id, username, full_name, gender, last_seen)
    VALUES (@TestAccountId, 'test_null', 'Test Null Gender', NULL, GETDATE());
    
    PRINT '✅ Test 1 PASSED: Có thể insert gender = NULL';
    
    -- Rollback để không làm ảnh hưởng dữ liệu thực
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ Test 1 FAILED: ' + ERROR_MESSAGE();
END CATCH
GO

-- Test 2: Insert với gender = 'Male' (phải thành công)
PRINT 'Test 2: Insert với gender = ''Male''...';
BEGIN TRY
    BEGIN TRANSACTION;
    
    DECLARE @TestAccountId2 INT;
    INSERT INTO Accounts (account_type, email, password_hash, status, created_at, updated_at)
    VALUES ('User', 'test_male@test.com', 'hash123', 'active', GETDATE(), GETDATE());
    
    SET @TestAccountId2 = SCOPE_IDENTITY();
    
    INSERT INTO Users (account_id, username, full_name, gender, last_seen)
    VALUES (@TestAccountId2, 'test_male', 'Test Male Gender', 'Male', GETDATE());
    
    PRINT '✅ Test 2 PASSED: Có thể insert gender = ''Male''';
    
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ Test 2 FAILED: ' + ERROR_MESSAGE();
END CATCH
GO

-- Test 3: Insert với gender = 'Invalid' (phải FAIL)
PRINT 'Test 3: Insert với gender = ''Invalid'' (phải bị reject)...';
BEGIN TRY
    BEGIN TRANSACTION;
    
    DECLARE @TestAccountId3 INT;
    INSERT INTO Accounts (account_type, email, password_hash, status, created_at, updated_at)
    VALUES ('User', 'test_invalid@test.com', 'hash123', 'active', GETDATE(), GETDATE());
    
    SET @TestAccountId3 = SCOPE_IDENTITY();
    
    INSERT INTO Users (account_id, username, full_name, gender, last_seen)
    VALUES (@TestAccountId3, 'test_invalid', 'Test Invalid Gender', 'Invalid', GETDATE());
    
    PRINT '❌ Test 3 FAILED: Không nên cho phép gender = ''Invalid''';
    
    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    IF ERROR_NUMBER() = 547 -- Check constraint violation
        PRINT '✅ Test 3 PASSED: Đã reject gender không hợp lệ (như mong đợi)';
    ELSE
        PRINT '❌ Test 3 FAILED: ' + ERROR_MESSAGE();
END CATCH
GO

PRINT '';
PRINT '============================================================================';
PRINT '                        HOÀN TẤT!';
PRINT '============================================================================';
PRINT '';
PRINT '✅ Gender constraint đã được fix thành công!';
PRINT '';
PRINT 'Bây giờ bạn có thể:';
PRINT '  1. Reload app (nhấn ''r'' trong Expo terminal)';
PRINT '  2. Login lại';
PRINT '  3. Vào được Home screen';
PRINT '  4. Test chức năng báo cáo vi phạm';
PRINT '';
PRINT 'Constraint mới cho phép:';
PRINT '  - gender = NULL (mặc định khi tạo user mới)';
PRINT '  - gender = ''Male'', ''Female'', ''Other''';
PRINT '  - gender = ''Nam'', ''Nữ'', ''Khác''';
PRINT '';
PRINT '============================================================================';
GO
