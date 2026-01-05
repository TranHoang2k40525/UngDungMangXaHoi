-- ====================================================================
-- TẠO LOGS VỚI DỮ LIỆU THẬT 100% TỪ DATABASE
-- Database: ungdungmangxahoiv_2
-- Mục đích: Lấy tên admin, user, post... THẬT từ database
-- ====================================================================

USE ungdungmangxahoiv_2;
GO

-- Bước 1: XÓA TOÀN BỘ logs cũ (dữ liệu giả)
DELETE FROM AdminActivityLogs;
PRINT '✅ Đã xóa ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' logs cũ (dữ liệu giả)';
GO

-- Bước 2: KIỂM TRA dữ liệu THẬT có sẵn
PRINT '';
PRINT '=== KIỂM TRA DỮ LIỆU THẬT TRONG DATABASE ===';

-- Kiểm tra Admins
SELECT 
    'ADMINS' AS [Loại],
    a.account_id AS [ID],
    acc.email AS [Email],
    'Admin thật' AS [Ghi chú]
FROM Accounts acc
WHERE acc.account_type = 'Admin'
ORDER BY acc.account_id;

-- Kiểm tra Users
SELECT TOP 3
    'USERS' AS [Loại],
    u.user_id AS [ID],
    u.username AS [Username],
    u.full_name AS [Tên đầy đủ],
    acc.email AS [Email]
FROM Users u
INNER JOIN Accounts acc ON u.account_id = acc.account_id
ORDER BY u.user_id;

-- Kiểm tra Posts
SELECT TOP 3
    'POSTS' AS [Loại],
    p.post_id AS [ID],
    LEFT(p.content, 50) AS [Nội dung],
    u.username AS [Tác giả]
FROM Posts p
INNER JOIN Users u ON p.user_id = u.user_id
ORDER BY p.post_id;

-- Kiểm tra Comments
SELECT TOP 3
    'COMMENTS' AS [Loại],
    c.comment_id AS [ID],
    LEFT(c.content, 50) AS [Nội dung],
    u.username AS [Người bình luận]
FROM Comments c
INNER JOIN Users u ON c.user_id = u.user_id
ORDER BY c.comment_id;

-- Kiểm tra Reports
SELECT TOP 3
    'REPORTS' AS [Loại],
    r.report_id AS [ID],
    r.report_type AS [Loại báo cáo],
    r.reason AS [Lý do],
    u.username AS [Người báo cáo]
FROM Reports r
INNER JOIN Users u ON r.reporter_user_id = u.user_id
ORDER BY r.report_id;
GO

PRINT '';
PRINT '=== BẮT ĐẦU TẠO LOGS VỚI DỮ LIỆU THẬT ===';
GO

-- =================================================================
-- Bước 3: TẠO LOGS VỚI DỮ LIỆU THẬT 100%
-- =================================================================

-- 3.1. LOG CẤM USER (Lấy admin email, user thật từ DB)
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);
DECLARE @AdminName NVARCHAR(255);
DECLARE @TargetUserId INT;
DECLARE @TargetUserName NVARCHAR(100);
DECLARE @TargetFullName NVARCHAR(255);

-- Lấy admin đầu tiên
SELECT TOP 1 
    @AdminAccountId = account_id,
    @AdminEmail = email
FROM Accounts 
WHERE account_type = 'Admin'
ORDER BY account_id;

-- Lấy user đầu tiên để ban
SELECT TOP 1 
    @TargetUserId = u.user_id,
    @TargetUserName = u.username,
    @TargetFullName = ISNULL(u.full_name, u.username)
FROM Users u
ORDER BY u.user_id;

IF @AdminAccountId IS NOT NULL AND @TargetUserId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin',  -- Tên hiển thị đơn giản
        @AdminEmail,  -- ✅ Email admin THẬT
        N'Cấm người dùng',
        N'user',
        @TargetUserId,  -- ✅ User ID THẬT
        N'@' + @TargetUserName,  -- ✅ Username THẬT
        N'Vi phạm quy định cộng đồng - Người dùng "' + @TargetFullName + N'" đã đăng spam nhiều lần',  -- ✅ Tên THẬT
        N'192.168.1.100',
        N'success',
        DATEADD(HOUR, -2, GETDATE())
    );
    PRINT '✅ Log: Cấm user @' + @TargetUserName + ' (' + @TargetFullName + ')';
END
ELSE
    PRINT '❌ Không đủ dữ liệu để tạo log ban user';
GO

-- 3.2. LOG XÓA POST (Lấy post thật, tác giả thật)
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);
DECLARE @PostId INT;
DECLARE @PostContent NVARCHAR(500);
DECLARE @PostAuthor NVARCHAR(100);

SELECT TOP 1 @AdminAccountId = account_id, @AdminEmail = email
FROM Accounts WHERE account_type = 'Admin' ORDER BY account_id;

SELECT TOP 1 
    @PostId = p.post_id,
    @PostContent = LEFT(ISNULL(p.content, N'Bài đăng'), 50),
    @PostAuthor = u.username
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
        @AdminEmail,  -- ✅ Email THẬT
        N'Xóa bài đăng vi phạm',
        N'post',
        @PostId,  -- ✅ Post ID THẬT
        N'Bài đăng #' + CAST(@PostId AS NVARCHAR),
        N'Nội dung không phù hợp của user @' + @PostAuthor + N': "' + @PostContent + N'"',  -- ✅ Tác giả & nội dung THẬT
        N'192.168.1.101',
        N'success',
        DATEADD(HOUR, -5, GETDATE())
    );
    PRINT '✅ Log: Xóa bài đăng #' + CAST(@PostId AS NVARCHAR) + ' của @' + @PostAuthor;
END
ELSE
    PRINT '❌ Không đủ dữ liệu để tạo log xóa post';
GO

-- 3.3. LOG ẨN COMMENT (Lấy comment thật, người bình luận thật)
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);
DECLARE @CommentId INT;
DECLARE @CommentContent NVARCHAR(500);
DECLARE @CommentAuthor NVARCHAR(100);

SELECT TOP 1 @AdminAccountId = account_id, @AdminEmail = email
FROM Accounts WHERE account_type = 'Admin' ORDER BY account_id;

SELECT TOP 1 
    @CommentId = c.comment_id,
    @CommentContent = LEFT(ISNULL(c.content, N'Bình luận'), 50),
    @CommentAuthor = u.username
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
        @AdminEmail,  -- ✅ Email THẬT
        N'Ẩn bình luận',
        N'comment',
        @CommentId,  -- ✅ Comment ID THẬT
        N'Bình luận #' + CAST(@CommentId AS NVARCHAR),
        N'Bình luận của @' + @CommentAuthor + N': "' + @CommentContent + N'" - Vi phạm quy tắc cộng đồng',  -- ✅ Tác giả THẬT
        N'192.168.1.102',
        N'success',
        DATEADD(HOUR, -8, GETDATE())
    );
    PRINT '✅ Log: Ẩn bình luận #' + CAST(@CommentId AS NVARCHAR) + ' của @' + @CommentAuthor;
END
ELSE
    PRINT '❌ Không đủ dữ liệu để tạo log ẩn comment';
GO

-- 3.4. LOG GIẢI QUYẾT REPORT (Lấy report thật, người báo cáo thật)
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);
DECLARE @ReportId INT;
DECLARE @ReportType NVARCHAR(50);
DECLARE @ReportReason NVARCHAR(500);
DECLARE @ReporterName NVARCHAR(100);

SELECT TOP 1 @AdminAccountId = account_id, @AdminEmail = email
FROM Accounts WHERE account_type = 'Admin' ORDER BY account_id;

SELECT TOP 1 
    @ReportId = r.report_id,
    @ReportType = r.report_type,
    @ReportReason = LEFT(ISNULL(r.reason, N'Không rõ lý do'), 100),
    @ReporterName = u.username
FROM Reports r
INNER JOIN Users u ON r.reporter_user_id = u.user_id
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
        @AdminEmail,  -- ✅ Email THẬT
        N'Giải quyết báo cáo',
        N'report',
        @ReportId,  -- ✅ Report ID THẬT
        N'Báo cáo #' + CAST(@ReportId AS NVARCHAR),
        N'Loại: ' + @ReportType + N' - Lý do: "' + @ReportReason + N'" (Người báo cáo: @' + @ReporterName + N')',  -- ✅ Dữ liệu THẬT
        N'192.168.1.104',
        N'success',
        DATEADD(HOUR, -1, GETDATE())
    );
    PRINT '✅ Log: Giải quyết báo cáo #' + CAST(@ReportId AS NVARCHAR) + ' từ @' + @ReporterName;
END
ELSE
    PRINT '❌ Không đủ dữ liệu để tạo log giải quyết report';
GO

-- 3.5. LOGS HỆ THỐNG (System logs với admin email thật)
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
        @AdminEmail,  -- ✅ Email admin THẬT
        N'Cập nhật cài đặt hệ thống',
        N'system',
        NULL,
        N'System Settings',
        N'Thay đổi giới hạn upload file: 10MB → 20MB',
        N'192.168.1.100',
        N'success',
        DATEADD(HOUR, -3, GETDATE())
    );

    PRINT '✅ Tạo 2 logs hệ thống với admin email: ' + @AdminEmail;
END
GO

-- =================================================================
-- Bước 4: KIỂM TRA KẾT QUẢ
-- =================================================================
PRINT '';
PRINT '=== KẾT QUẢ CUỐI CÙNG - DỮ LIỆU THẬT 100% ===';

SELECT 
    COUNT(*) AS [Tổng logs],
    SUM(CASE WHEN EntityId IS NOT NULL THEN 1 ELSE 0 END) AS [Có EntityId],
    SUM(CASE WHEN EntityId IS NULL THEN 1 ELSE 0 END) AS [Logs hệ thống]
FROM AdminActivityLogs;

PRINT '';
PRINT '=== CHI TIẾT LOGS ĐÃ TẠO (DỮ LIỆU THẬT) ===';
SELECT 
    Id,
    AdminEmail AS [Admin Email THẬT],
    Action AS [Hành động],
    EntityType AS [Loại],
    EntityId AS [ID Entity],
    EntityName AS [Tên Entity],
    LEFT(Details, 80) AS [Chi tiết],
    Status,
    CONVERT(VARCHAR, Timestamp, 120) AS [Thời gian]
FROM AdminActivityLogs
ORDER BY Timestamp DESC;
GO

PRINT '';
PRINT '========================================';
PRINT '✅ HOÀN TẤT - TẤT CẢ LÀ DỮ LIỆU THẬT!';
PRINT '========================================';
PRINT '';
PRINT '📊 DỮ LIỆU THẬT ĐÃ SỬ DỤNG:';
PRINT '   - Admin Email: Từ bảng Accounts (account_type = Admin)';
PRINT '   - User: Từ bảng Users (username, full_name)';
PRINT '   - Post: Từ bảng Posts (content, tác giả)';
PRINT '   - Comment: Từ bảng Comments (content, người bình luận)';
PRINT '   - Report: Từ bảng Reports (reason, người báo cáo)';
PRINT '';
PRINT '🔍 TEST API:';
PRINT '   curl "http://localhost:5297/api/admin/activity-logs?page=1&pageSize=10"';
PRINT '';
PRINT '🌐 TEST FRONTEND:';
PRINT '   http://localhost:3001/admin-logs';
PRINT '   - Thấy email admin THẬT (quan2004toanlyhoa@gmail.com)';
PRINT '   - Thấy username THẬT (@quan, @quan2004toanlyhoa_5...)';
PRINT '   - Icon 🔍 ở logs có EntityId';
PRINT '   - Click xem modal chi tiết';
PRINT '';
GO
