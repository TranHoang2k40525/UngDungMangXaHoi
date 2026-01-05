-- ============================================
-- FIX REPORTS FOREIGN KEY ISSUE
-- ============================================
-- File: FIX_REPORTS_FOREIGN_KEY.sql

USE ungdungmangxahoiv_2;
GO

PRINT '========================================';
PRINT '1. KIEM TRA ADMIN HIEN TAI';
PRINT '========================================';
GO

-- Kiểm tra admin hiện tại (dùng STRING cho account_type)
SELECT 
    a.account_id,
    a.email,
    a.account_type,
    adm.admin_id,
    adm.full_name,
    adm.admin_level
FROM Accounts a
LEFT JOIN Admins adm ON a.account_id = adm.account_id
WHERE a.email = 'kfc09122004@gmail.com';
GO

PRINT '';
PRINT '========================================';
PRINT '2. TEST QUERY DE LAY ADMIN_ID';
PRINT '========================================';
GO

-- Test query giống backend
DECLARE @accountId INT = 8; -- account_id từ JWT token

SELECT 
    admin_id,
    account_id,
    full_name,
    admin_level
FROM Admins
WHERE account_id = @accountId;
GO

PRINT '';
PRINT '========================================';
PRINT '3. KIEM TRA REPORTS HIEN TAI';
PRINT '========================================';
GO

-- Xem các reports chưa xử lý
SELECT 
    r.report_id,
    r.content_type,
    r.reason,
    r.status,
    r.resolved_by,
    r.created_at
FROM Reports r
WHERE r.status = 'pending'
ORDER BY r.created_at DESC;
GO

PRINT '';
PRINT '========================================';
PRINT '4. TEST UPDATE REPORT (GIONG BACKEND)';
PRINT '========================================';
GO

-- Simulate backend update
DECLARE @reportId INT = 2; -- Report ID cần update
DECLARE @adminAccountId INT = 8; -- account_id từ token
DECLARE @adminIdToUse INT;

-- Lấy admin_id từ account_id
SELECT @adminIdToUse = admin_id
FROM Admins
WHERE account_id = @adminAccountId;

PRINT 'Admin Account ID: ' + CAST(@adminAccountId AS NVARCHAR(10));
PRINT 'Admin ID to use: ' + ISNULL(CAST(@adminIdToUse AS NVARCHAR(10)), 'NULL');

-- Kiểm tra admin_id có tồn tại không
IF @adminIdToUse IS NULL
BEGIN
    PRINT 'LOI: Khong tim thay admin_id cho account_id = ' + CAST(@adminAccountId AS NVARCHAR(10));
    PRINT 'Can INSERT record vao bang Admins';
END
ELSE
BEGIN
    PRINT 'OK: admin_id = ' + CAST(@adminIdToUse AS NVARCHAR(10)) + ' ton tai';
    
    -- TEST UPDATE (COMMENTED OUT - uncomment to actually update)
    /*
    UPDATE Reports
    SET 
        status = 'resolved',
        resolved_by = @adminIdToUse,
        resolved_at = GETUTCDATE(),
        admin_note = 'Test update'
    WHERE report_id = @reportId;
    
    PRINT 'UPDATE thanh cong!';
    */
    
    PRINT 'De UPDATE that, uncomment code tren';
END
GO

PRINT '';
PRINT '========================================';
PRINT '5. KIEM TRA LAI SAU KHI UPDATE';
PRINT '========================================';
GO

SELECT 
    r.report_id,
    r.content_type,
    r.status,
    r.resolved_by,
    adm.full_name AS resolved_by_name
FROM Reports r
LEFT JOIN Admins adm ON r.resolved_by = adm.admin_id
WHERE r.report_id IN (1, 2, 3);
GO

PRINT '';
PRINT '========================================';
PRINT 'KET LUAN';
PRINT '========================================';
PRINT '';
PRINT 'Neu admin_id TIM THAY:';
PRINT '   => Backend CODE DUNG, co the do logic issue';
PRINT '   => Can rebuild backend va test lai';
PRINT '';
PRINT 'Neu admin_id = NULL:';
PRINT '   => Can tao Admin record:';
PRINT '   => INSERT INTO Admins (account_id, full_name, admin_level)';
PRINT '   => VALUES (8, ''Admin Name'', ''moderator'')';
PRINT '';
GO
