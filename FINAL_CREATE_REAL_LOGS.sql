-- ====================================================================
-- TẠO LOGS VỚI DỮ LIỆU THẬT 100% - SCHEMA ĐÚNG
-- Database: ungdungmangxahoiv_2
-- Fix: Sử dụng đúng column names từ database
-- ====================================================================

USE ungdungmangxahoiv_2;
GO

-- Bước 1: XÓA TOÀN BỘ logs cũ
DELETE FROM AdminActivityLogs;
PRINT '✅ Đã xóa ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' logs cũ';
GO

PRINT '';
PRINT '=== BẮT ĐẦU TẠO LOGS VỚI DỮ LIỆU THẬT ===';
GO

-- =================================================================
-- LOG 1: CẤM USER (Dữ liệu thật 100%)
-- =================================================================
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);
DECLARE @UserId INT;
DECLARE @UserName NVARCHAR(100);
DECLARE @FullName NVARCHAR(255);

-- Lấy admin THẬT
SELECT TOP 1 @AdminAccountId = account_id, @AdminEmail = email
FROM Accounts WHERE account_type = 'Admin' ORDER BY account_id;

-- Lấy user THẬT
SELECT TOP 1 
    @UserId = u.user_id,
    @UserName = u.username,
    @FullName = ISNULL(u.full_name, u.username)
FROM Users u
ORDER BY u.user_id;

IF @AdminAccountId IS NOT NULL AND @UserId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin',
        @AdminEmail,
        N'Cấm người dùng',
        N'user',
        @UserId,
        N'@' + @UserName,
        N'Vi phạm quy định - User "' + @FullName + N'" spam nhiều lần',
        N'192.168.1.100',
        N'success',
        DATEADD(HOUR, -2, GETDATE())
    );
    PRINT '✅ Log 1: Cấm @' + @UserName + ' (' + @FullName + ')';
END
ELSE
    PRINT '❌ Không có User để tạo log';
GO

-- =================================================================
-- LOG 2: XÓA POST (Dữ liệu thật 100%)
-- =================================================================
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);
DECLARE @PostId INT;
DECLARE @PostCaption NVARCHAR(500);
DECLARE @AuthorName NVARCHAR(100);

SELECT TOP 1 @AdminAccountId = account_id, @AdminEmail = email
FROM Accounts WHERE account_type = 'Admin' ORDER BY account_id;

SELECT TOP 1 
    @PostId = p.post_id,
    @PostCaption = LEFT(ISNULL(p.caption, N'(Không có caption)'), 50),  -- ✅ caption, không phải content
    @AuthorName = u.username
FROM Posts p
INNER JOIN Users u ON p.user_id = u.user_id
ORDER BY p.post_id;

IF @AdminAccountId IS NOT NULL AND @PostId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin',
        @AdminEmail,
        N'Xóa bài đăng vi phạm',
        N'post',
        @PostId,
        N'Bài đăng #' + CAST(@PostId AS NVARCHAR),
        N'Post của @' + @AuthorName + N': "' + @PostCaption + N'" - Nội dung không phù hợp',
        N'192.168.1.101',
        N'success',
        DATEADD(HOUR, -5, GETDATE())
    );
    PRINT '✅ Log 2: Xóa post #' + CAST(@PostId AS NVARCHAR) + ' của @' + @AuthorName;
END
ELSE
    PRINT '❌ Không có Post để tạo log';
GO

-- =================================================================
-- LOG 3: ẨN COMMENT (Dữ liệu thật 100%)
-- =================================================================
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);
DECLARE @CommentId INT;
DECLARE @CommentContent NVARCHAR(500);
DECLARE @CommenterName NVARCHAR(100);

SELECT TOP 1 @AdminAccountId = account_id, @AdminEmail = email
FROM Accounts WHERE account_type = 'Admin' ORDER BY account_id;

SELECT TOP 1 
    @CommentId = c.comment_id,
    @CommentContent = LEFT(ISNULL(c.content, N'(Không có nội dung)'), 50),  -- ✅ content đúng
    @CommenterName = u.username
FROM Comments c
INNER JOIN Users u ON c.user_id = u.user_id
ORDER BY c.comment_id;

IF @AdminAccountId IS NOT NULL AND @CommentId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin',
        @AdminEmail,
        N'Ẩn bình luận',
        N'comment',
        @CommentId,
        N'Bình luận #' + CAST(@CommentId AS NVARCHAR),
        N'Comment của @' + @CommenterName + N': "' + @CommentContent + N'" - Vi phạm quy tắc',
        N'192.168.1.102',
        N'success',
        DATEADD(HOUR, -8, GETDATE())
    );
    PRINT '✅ Log 3: Ẩn comment #' + CAST(@CommentId AS NVARCHAR) + ' của @' + @CommenterName;
END
ELSE
    PRINT '❌ Không có Comment để tạo log';
GO

-- =================================================================
-- LOG 4: GIẢI QUYẾT REPORT (Dữ liệu thật 100%)
-- =================================================================
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);
DECLARE @ReportId INT;
DECLARE @ContentType NVARCHAR(50);
DECLARE @ReportReason NVARCHAR(500);
DECLARE @ReporterName NVARCHAR(100);

SELECT TOP 1 @AdminAccountId = account_id, @AdminEmail = email
FROM Accounts WHERE account_type = 'Admin' ORDER BY account_id;

SELECT TOP 1 
    @ReportId = r.report_id,
    @ContentType = ISNULL(r.content_type, N'Unknown'),  -- ✅ content_type, không phải report_type
    @ReportReason = LEFT(ISNULL(r.reason, N'Không rõ lý do'), 100),
    @ReporterName = u.username
FROM Reports r
INNER JOIN Users u ON r.reporter_id = u.user_id  -- ✅ reporter_id, không phải reporter_user_id
ORDER BY r.report_id;

IF @AdminAccountId IS NOT NULL AND @ReportId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin',
        @AdminEmail,
        N'Giải quyết báo cáo',
        N'report',
        @ReportId,
        N'Báo cáo #' + CAST(@ReportId AS NVARCHAR),
        N'Loại: ' + @ContentType + N' - "' + @ReportReason + N'" (Người báo: @' + @ReporterName + N')',
        N'192.168.1.104',
        N'success',
        DATEADD(HOUR, -1, GETDATE())
    );
    PRINT '✅ Log 4: Giải quyết report #' + CAST(@ReportId AS NVARCHAR) + ' từ @' + @ReporterName;
END
ELSE
    PRINT '❌ Không có Report để tạo log';
GO

-- =================================================================
-- LOG 5-6: HỆ THỐNG (System logs)
-- =================================================================
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);

SELECT TOP 1 @AdminAccountId = account_id, @AdminEmail = email
FROM Accounts WHERE account_type = 'Admin' ORDER BY account_id;

IF @AdminAccountId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES 
    (
        @AdminAccountId,
        N'System',
        N'system@snap67cs.com',
        N'Sao lưu dữ liệu',
        N'system',
        NULL,
        N'Database Backup',
        N'Sao lưu tự động hàng ngày vào 02:00 AM',
        N'127.0.0.1',
        N'success',
        DATEADD(DAY, -1, GETDATE())
    ),
    (
        @AdminAccountId,
        N'Admin',
        @AdminEmail,
        N'Cập nhật cài đặt hệ thống',
        N'system',
        NULL,
        N'System Settings',
        N'Thay đổi giới hạn upload file: 10MB → 20MB',
        N'192.168.1.100',
        N'success',
        DATEADD(HOUR, -3, GETDATE())
    );

    PRINT '✅ Log 5-6: Tạo 2 system logs';
END
GO

-- =================================================================
-- KIỂM TRA KẾT QUẢ
-- =================================================================
PRINT '';
PRINT '========================================';
PRINT '✅ KẾT QUẢ CUỐI CÙNG';
PRINT '========================================';

SELECT 
    COUNT(*) AS [Tổng logs],
    SUM(CASE WHEN EntityId IS NOT NULL THEN 1 ELSE 0 END) AS [Có EntityId - Click được],
    SUM(CASE WHEN EntityId IS NULL THEN 1 ELSE 0 END) AS [System logs]
FROM AdminActivityLogs;

PRINT '';
PRINT '=== LOGS VỪA TẠO (DỮ LIỆU THẬT 100%) ===';
SELECT 
    Id,
    AdminEmail AS [Email Admin],
    Action AS [Hành động],
    EntityType AS [Loại],
    EntityId AS [ID],
    EntityName AS [Tên],
    LEFT(Details, 60) AS [Chi tiết],
    CONVERT(VARCHAR, Timestamp, 120) AS [Thời gian]
FROM AdminActivityLogs
ORDER BY Timestamp DESC;
GO

PRINT '';
PRINT '========================================';
PRINT '🎉 HOÀN TẤT - DỮ LIỆU THẬT 100%!';
PRINT '========================================';
PRINT '';
PRINT '📊 Schema được sử dụng:';
PRINT '   ✅ Posts.caption (không phải content)';
PRINT '   ✅ Reports.reporter_id (không phải reporter_user_id)';
PRINT '   ✅ Reports.content_type (không phải report_type)';
PRINT '   ✅ Comments.content (đúng)';
PRINT '';
PRINT '🔍 TEST API (PowerShell):';
PRINT '   $r = Invoke-RestMethod "http://localhost:5297/api/admin/activity-logs?page=1&pageSize=10"';
PRINT '   $r.logs | Select-Object id, adminEmail, action, entityId, entityName | Format-Table';
PRINT '';
PRINT '🌐 TEST FRONTEND:';
PRINT '   1. Mở: http://localhost:3001/admin-logs';
PRINT '   2. Kiểm tra tiếng Việt hiển thị CHUẨN';
PRINT '   3. Tìm logs có icon 🔍 (có EntityId)';
PRINT '   4. Hover → cursor: pointer';
PRINT '   5. Click → modal chi tiết mở ra';
PRINT '';
GO
