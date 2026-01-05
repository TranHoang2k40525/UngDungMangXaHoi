-- =============================================
-- FIX VIETNAMESE ENCODING IN REPORTS TABLE
-- Run this script in SQL Server Management Studio
-- Database: ungdungmangxahoiv_2
-- =============================================

USE ungdungmangxahoiv_2;
GO

-- Step 1: Delete old data with wrong encoding
PRINT '=== Step 1: Deleting old reports data ===';
DELETE FROM Reports;
PRINT 'Deleted ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' rows';
GO

-- Step 2: Reset identity counter
PRINT '=== Step 2: Resetting identity counter ===';
DBCC CHECKIDENT ('Reports', RESEED, 0);
GO

-- Step 3: Insert new data with correct UTF-8 encoding
-- IMPORTANT: Use N prefix before Vietnamese strings
PRINT '=== Step 3: Inserting reports with UTF-8 encoding ===';

-- Report 1: Spam
INSERT INTO Reports (
    reporter_id,
    reported_user_id,
    content_type,
    content_id,
    reason,
    description,
    status,
    created_at
)
VALUES (
    1,                                                          -- reporter_id (user 1)
    1,                                                          -- reported_user_id (user 1)
    'post',                                                     -- content_type
    1,                                                          -- content_id (post 1)
    N'Spam',                                                    -- reason (WITH N PREFIX)
    N'Bài đăng quảng cáo sản phẩm không liên quan',           -- description (WITH N PREFIX)
    'pending',                                                  -- status
    GETDATE()                                                   -- created_at
);
PRINT 'Inserted Report 1: Spam';

-- Report 2: Copyright Violation
INSERT INTO Reports (
    reporter_id,
    reported_user_id,
    content_type,
    content_id,
    reason,
    description,
    status,
    created_at
)
VALUES (
    1,
    1,
    'post',
    1,
    N'Vi phạm bản quyền',                                      -- WITH N PREFIX
    N'Sử dụng hình ảnh không xin phép',                       -- WITH N PREFIX
    'pending',
    GETDATE()
);
PRINT 'Inserted Report 2: Vi phạm bản quyền';

-- Report 3: Inappropriate Content
INSERT INTO Reports (
    reporter_id,
    reported_user_id,
    content_type,
    content_id,
    reason,
    description,
    status,
    created_at
)
VALUES (
    1,
    1,
    'post',
    1,
    N'Nội dung không phù hợp',                                 -- WITH N PREFIX
    N'Hình ảnh bạo lực, không phù hợp với cộng đồng',         -- WITH N PREFIX
    'pending',
    GETDATE()
);
PRINT 'Inserted Report 3: Nội dung không phù hợp';

GO

-- Step 4: Verify inserted data
PRINT '=== Step 4: Verifying inserted data ===';
PRINT '';

-- Get count in variable first (fix subquery error)
DECLARE @TotalReports INT;
SET @TotalReports = (SELECT COUNT(*) FROM Reports);
PRINT 'Total reports inserted: ' + CAST(@TotalReports AS VARCHAR(10));
PRINT '';
PRINT '=== Reports Data ===';

SELECT 
    report_id AS [ID],
    content_type AS [Loại],
    reason AS [Lý do],
    description AS [Mô tả],
    status AS [Trạng thái],
    CONVERT(VARCHAR(20), created_at, 120) AS [Thời gian]
FROM Reports
ORDER BY report_id;

GO

PRINT '';
PRINT '=== SUCCESS! ===';
PRINT 'Đã insert 3 báo cáo với encoding UTF-8 đúng';
PRINT '';
PRINT 'Expected results:';
PRINT '  Report 1: Spam - Bài đăng quảng cáo sản phẩm không liên quan';
PRINT '  Report 2: Vi phạm bản quyền - Sử dụng hình ảnh không xin phép';
PRINT '  Report 3: Nội dung không phù hợp - Hình ảnh bạo lực, không phù hợp với cộng đồng';
PRINT '';
PRINT 'Next step: Refresh frontend at http://localhost:3001/reports';
GO
