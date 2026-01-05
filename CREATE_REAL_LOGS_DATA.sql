-- ====================================================================
-- TẠO DỮ LIỆU THẬT CHO ADMIN ACTIVITY LOGS
-- Database: ungdungmangxahoiv_2
-- Mục đích: Tạo logs có EntityId để test modal click
-- ====================================================================

USE ungdungmangxahoiv_2;
GO

-- Bước 1: Xóa logs cũ không có EntityId
DELETE FROM AdminActivityLogs WHERE EntityId IS NULL;
PRINT 'Đã xóa ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' logs cũ không có EntityId';
GO

-- Bước 2: Kiểm tra dữ liệu hiện có
PRINT '=== KIỂM TRA DỮ LIỆU HIỆN CÓ ===';
SELECT 
    'Users' AS TableName, 
    COUNT(*) AS [Count],
    MIN(user_id) AS FirstId,
    MAX(user_id) AS LastId
FROM Users
UNION ALL
SELECT 
    'Posts', 
    COUNT(*),
    MIN(post_id),
    MAX(post_id)
FROM Posts
UNION ALL
SELECT 
    'Comments', 
    COUNT(*),
    MIN(comment_id),
    MAX(comment_id)
FROM Comments
UNION ALL
SELECT 
    'Reports', 
    COUNT(*),
    MIN(report_id),
    MAX(report_id)
FROM Reports;
GO

-- Bước 3: Lấy Admin Account ID
DECLARE @AdminAccountId INT;
SELECT TOP 1 @AdminAccountId = account_id 
FROM Accounts 
WHERE account_type = 'Admin' 
ORDER BY account_id;

PRINT '=== ADMIN ACCOUNT ===';
PRINT 'AdminAccountId: ' + CAST(@AdminAccountId AS NVARCHAR);
GO

-- Bước 4: Tạo logs mới với EntityId thật
-- Lưu ý: Sử dụng AdminAccountId = 5 (admin thật từ database)

-- 4.1. Log cho User
DECLARE @AdminAccountId INT = 5;
DECLARE @UserId1 INT, @UserName1 NVARCHAR(100);

SELECT TOP 1 
    @UserId1 = user_id,
    @UserName1 = username
FROM Users 
ORDER BY user_id;

IF @UserId1 IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (AdminAccountId, AdminName, AdminEmail, Action, EntityType, EntityId, EntityName, Details, IpAddress, Status, Timestamp)
    VALUES 
    (
        @AdminAccountId,
        N'Admin Nguyễn Văn A',
        'quan2004toanlyhoa@gmail.com',
        N'Cấm người dùng',
        'user',
        @UserId1,
        '@' + @UserName1,
        N'Vi phạm quy định cộng đồng - Spam liên tục',
        '192.168.1.100',
        'success',
        DATEADD(HOUR, -2, GETDATE())
    );
    PRINT 'Đã tạo log: Cấm người dùng @' + @UserName1 + ' (ID: ' + CAST(@UserId1 AS NVARCHAR) + ')';
END
ELSE
BEGIN
    PRINT 'CẢNH BÁO: Không có User nào trong database!';
END
GO

-- 4.2. Log cho Post
DECLARE @AdminAccountId INT = 5;
DECLARE @PostId1 INT;

SELECT TOP 1 @PostId1 = post_id FROM Posts ORDER BY post_id;

IF @PostId1 IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (AdminAccountId, AdminName, AdminEmail, Action, EntityType, EntityId, EntityName, Details, IpAddress, Status, Timestamp)
    VALUES 
    (
        @AdminAccountId,
        N'Admin Trần Thị B',
        'quan2004toanlyhoa@gmail.com',
        N'Xóa bài đăng vi phạm',
        'post',
        @PostId1,
        N'Bài đăng #' + CAST(@PostId1 AS NVARCHAR),
        N'Nội dung không phù hợp - Chứa ngôn từ công kích',
        '192.168.1.101',
        'success',
        DATEADD(HOUR, -5, GETDATE())
    );
    PRINT 'Đã tạo log: Xóa bài đăng #' + CAST(@PostId1 AS NVARCHAR);
END
ELSE
BEGIN
    PRINT 'CẢNH BÁO: Không có Post nào trong database!';
END
GO

-- 4.3. Log cho Comment
DECLARE @AdminAccountId INT = 5;
DECLARE @CommentId1 INT;

SELECT TOP 1 @CommentId1 = comment_id FROM Comments ORDER BY comment_id;

IF @CommentId1 IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (AdminAccountId, AdminName, AdminEmail, Action, EntityType, EntityId, EntityName, Details, IpAddress, Status, Timestamp)
    VALUES 
    (
        @AdminAccountId,
        N'Admin Lê Văn C',
        'quan2004toanlyhoa@gmail.com',
        N'Ẩn bình luận',
        'comment',
        @CommentId1,
        N'Bình luận #' + CAST(@CommentId1 AS NVARCHAR),
        N'Bình luận chứa ngôn từ thù địch',
        '192.168.1.102',
        'success',
        DATEADD(HOUR, -8, GETDATE())
    );
    PRINT 'Đã tạo log: Ẩn bình luận #' + CAST(@CommentId1 AS NVARCHAR);
END
ELSE
BEGIN
    PRINT 'CẢNH BÁO: Không có Comment nào trong database!';
END
GO

-- 4.4. Log cho Report
DECLARE @AdminAccountId INT = 5;
DECLARE @ReportId1 INT;

SELECT TOP 1 @ReportId1 = report_id FROM Reports ORDER BY report_id;

IF @ReportId1 IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (AdminAccountId, AdminName, AdminEmail, Action, EntityType, EntityId, EntityName, Details, IpAddress, Status, Timestamp)
    VALUES 
    (
        @AdminAccountId,
        N'Admin Hoàng Văn E',
        'quan2004toanlyhoa@gmail.com',
        N'Giải quyết báo cáo',
        'report',
        @ReportId1,
        N'Báo cáo #' + CAST(@ReportId1 AS NVARCHAR),
        N'Đã xử lý vi phạm - Cấm người dùng 7 ngày',
        '192.168.1.104',
        'success',
        DATEADD(HOUR, -1, GETDATE())
    );
    PRINT 'Đã tạo log: Giải quyết báo cáo #' + CAST(@ReportId1 AS NVARCHAR);
END
ELSE
BEGIN
    PRINT 'CẢNH BÁO: Không có Report nào trong database!';
END
GO

-- Bước 5: Thêm logs hệ thống (không cần EntityId)
DECLARE @AdminAccountId INT = 5;

INSERT INTO AdminActivityLogs (AdminAccountId, AdminName, AdminEmail, Action, EntityType, EntityId, EntityName, Details, IpAddress, Status, Timestamp)
VALUES 
(
    @AdminAccountId,
    N'System',
    'system@snap67cs.com',
    N'Sao lưu dữ liệu',
    'system',
    NULL,
    N'Database Backup',
    N'Sao lưu tự động hàng ngày',
    '127.0.0.1',
    'success',
    DATEADD(DAY, -1, GETDATE())
),
(
    @AdminAccountId,
    N'Admin Nguyễn Văn A',
    'quan2004toanlyhoa@gmail.com',
    N'Cập nhật cài đặt hệ thống',
    'system',
    NULL,
    N'System Settings',
    N'Thay đổi giới hạn upload file: 10MB → 20MB',
    '192.168.1.100',
    'success',
    DATEADD(HOUR, -3, GETDATE())
);

PRINT 'Đã tạo 2 logs hệ thống';
GO

-- Bước 6: Kiểm tra kết quả
PRINT '=== KẾT QUẢ ===';
SELECT 
    COUNT(*) AS TotalLogs,
    SUM(CASE WHEN EntityId IS NOT NULL THEN 1 ELSE 0 END) AS LogsWithEntityId,
    SUM(CASE WHEN EntityId IS NULL THEN 1 ELSE 0 END) AS LogsWithoutEntityId
FROM AdminActivityLogs;

PRINT '';
PRINT '=== CHI TIẾT LOGS VỪA TẠO (Top 10) ===';
SELECT TOP 10
    Id,
    AdminName,
    Action,
    EntityType,
    EntityId,
    EntityName,
    Status,
    Timestamp
FROM AdminActivityLogs
ORDER BY Timestamp DESC;
GO

PRINT '';
PRINT '✅ HOÀN TẤT! Bây giờ hãy:';
PRINT '1. Mở trình duyệt: http://localhost:3001/admin-logs';
PRINT '2. Tìm logs có icon 🔍 (có EntityId)';
PRINT '3. Click vào log để xem modal chi tiết';
PRINT '4. Kiểm tra cursor pointer khi hover';
GO
