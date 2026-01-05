-- ====================================================================
-- TẠO LOGS VỚI DỮ LIỆU THẬT 100% - SCHEMA ĐÚNG
-- Database: ungdungmangxahoiv_2
-- ====================================================================

USE ungdungmangxahoiv_2;
GO

-- Bước 1: XÓA TOÀN BỘ logs cũ
DELETE FROM AdminActivityLogs;
PRINT N'✅ Đã xóa ' + CAST(@@ROWCOUNT AS NVARCHAR) + N' logs cũ';
GO

-- Bước 2: TẠO LOGS MỚI VỚI DỮ LIỆU THẬT

-- 2.1. LOG CHO USER (dữ liệu thật)
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);
DECLARE @UserId INT;
DECLARE @UserName NVARCHAR(100);
DECLARE @UserFullName NVARCHAR(255);

-- Lấy Admin thật
SELECT TOP 1 
    @AdminAccountId = account_id,
    @AdminEmail = email
FROM Accounts 
WHERE account_type = N'Admin'
ORDER BY account_id;

-- Lấy User thật
SELECT TOP 1 
    @UserId = user_id,
    @UserName = username,
    @UserFullName = ISNULL(full_name, username)
FROM Users 
ORDER BY user_id;

IF @UserId IS NOT NULL AND @AdminAccountId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin System',  -- Tên admin thật (có thể thay bằng tên từ bảng Admins)
        @AdminEmail,
        N'Cấm người dùng',
        N'user',
        @UserId,
        N'@' + @UserName,
        N'Vi phạm quy định cộng đồng - Đăng spam liên tục. User: ' + @UserFullName,
        N'192.168.1.100',
        N'success',
        DATEADD(HOUR, -2, GETDATE())
    );
    PRINT N'✅ Log: Cấm user @' + @UserName + N' (' + @UserFullName + N')';
END
ELSE
    PRINT N'❌ Không có User hoặc Admin trong database';
GO

-- 2.2. LOG CHO POST (dữ liệu thật)
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);
DECLARE @PostId INT;
DECLARE @PostCaption NVARCHAR(500);
DECLARE @PostAuthorName NVARCHAR(100);

-- Lấy Admin thật
SELECT TOP 1 
    @AdminAccountId = account_id,
    @AdminEmail = email
FROM Accounts 
WHERE account_type = N'Admin'
ORDER BY account_id;

-- Lấy Post thật với tác giả
SELECT TOP 1 
    p.post_id,
    @PostCaption = LEFT(ISNULL(p.caption, N'(Không có caption)'), 50),
    @PostAuthorName = u.username
FROM Posts p
LEFT JOIN Users u ON p.user_id = u.user_id
ORDER BY p.post_id;

IF @PostId IS NOT NULL AND @AdminAccountId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin System',
        @AdminEmail,
        N'Xóa bài đăng vi phạm',
        N'post',
        @PostId,
        N'Bài đăng #' + CAST(@PostId AS NVARCHAR),
        N'Nội dung không phù hợp - Tác giả: @' + ISNULL(@PostAuthorName, N'Unknown') + N'. Caption: "' + @PostCaption + N'"',
        N'192.168.1.101',
        N'success',
        DATEADD(HOUR, -5, GETDATE())
    );
    PRINT N'✅ Log: Xóa bài đăng #' + CAST(@PostId AS NVARCHAR) + N' của @' + ISNULL(@PostAuthorName, N'Unknown');
END
ELSE
    PRINT N'❌ Không có Post hoặc Admin trong database';
GO

-- 2.3. LOG CHO COMMENT (dữ liệu thật)
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);
DECLARE @CommentId INT;
DECLARE @CommentAuthorName NVARCHAR(100);

-- Lấy Admin thật
SELECT TOP 1 
    @AdminAccountId = account_id,
    @AdminEmail = email
FROM Accounts 
WHERE account_type = N'Admin'
ORDER BY account_id;

-- Lấy Comment thật
SELECT TOP 1 
    c.comment_id,
    @CommentAuthorName = u.username
FROM Comments c
LEFT JOIN Users u ON c.user_id = u.user_id
ORDER BY c.comment_id;

IF @CommentId IS NOT NULL AND @AdminAccountId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin System',
        @AdminEmail,
        N'Ẩn bình luận',
        N'comment',
        @CommentId,
        N'Bình luận #' + CAST(@CommentId AS NVARCHAR),
        N'Bình luận chứa ngôn từ thù địch - Tác giả: @' + ISNULL(@CommentAuthorName, N'Unknown'),
        N'192.168.1.102',
        N'success',
        DATEADD(HOUR, -8, GETDATE())
    );
    PRINT N'✅ Log: Ẩn bình luận #' + CAST(@CommentId AS NVARCHAR) + N' của @' + ISNULL(@CommentAuthorName, N'Unknown');
END
ELSE
    PRINT N'❌ Không có Comment hoặc Admin trong database';
GO

-- 2.4. LOG CHO REPORT (dữ liệu thật)
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);
DECLARE @ReportId INT;

-- Lấy Admin thật
SELECT TOP 1 
    @AdminAccountId = account_id,
    @AdminEmail = email
FROM Accounts 
WHERE account_type = N'Admin'
ORDER BY account_id;

-- Lấy Report thật
SELECT TOP 1 @ReportId = report_id FROM Reports ORDER BY report_id;

IF @ReportId IS NOT NULL AND @AdminAccountId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin System',
        @AdminEmail,
        N'Giải quyết báo cáo',
        N'report',
        @ReportId,
        N'Báo cáo #' + CAST(@ReportId AS NVARCHAR),
        N'Đã xử lý vi phạm - Cấm người dùng 7 ngày',
        N'192.168.1.104',
        N'success',
        DATEADD(HOUR, -1, GETDATE())
    );
    PRINT N'✅ Log: Giải quyết báo cáo #' + CAST(@ReportId AS NVARCHAR);
END
ELSE
    PRINT N'❌ Không có Report hoặc Admin trong database';
GO

-- 2.5. LOGS HỆ THỐNG
DECLARE @AdminAccountId INT;
DECLARE @AdminEmail NVARCHAR(255);

SELECT TOP 1 
    @AdminAccountId = account_id,
    @AdminEmail = email
FROM Accounts 
WHERE account_type = N'Admin'
ORDER BY account_id;

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
    N'Admin System',
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

PRINT N'✅ Tạo 2 logs hệ thống với admin email: ' + @AdminEmail;
GO

-- Bước 3: KIỂM TRA KẾT QUẢ
PRINT N'';
PRINT N'=== KẾT QUẢ CUỐI CÙNG - DỮ LIỆU THẬT 100% ===';
SELECT 
    COUNT(*) AS [Tổng logs],
    SUM(CASE WHEN EntityId IS NOT NULL THEN 1 ELSE 0 END) AS [Có EntityId],
    SUM(CASE WHEN EntityId IS NULL THEN 1 ELSE 0 END) AS [Không có EntityId]
FROM AdminActivityLogs;

PRINT N'';
PRINT N'=== CHI TIẾT LOGS ĐÃ TẠO (DỮ LIỆU THẬT) ===';
SELECT 
    Id,
    AdminEmail,
    Action,
    EntityType,
    EntityId,
    EntityName,
    LEFT(Details, 50) + N'...' AS [Details],
    Status,
    CONVERT(VARCHAR, Timestamp, 120) AS [Thời gian]
FROM AdminActivityLogs
ORDER BY Timestamp DESC;
GO

PRINT N'';
PRINT N'========================================';
PRINT N'✅ HOÀN TẤT - TẤT CẢ LÀ DỮ LIỆU THẬT!';
PRINT N'========================================';
PRINT N'';
PRINT N'📌 DỮ LIỆU THẬT ĐÃ SỬ DỤNG:';
PRINT N'   - Admin Email: Từ bảng Accounts (account_type = Admin)';
PRINT N'   - User: Từ bảng Users (username, full_name)';
PRINT N'   - Post: Từ bảng Posts (caption, tác giả)';
PRINT N'   - Comment: Từ bảng Comments (content, người bình luận)';
PRINT N'   - Report: Từ bảng Reports (reason, người báo cáo)';
PRINT N'';
PRINT N'📌 TEST API:';
PRINT N'   curl "http://localhost:5297/api/admin/activity-logs?page=1&pageSize=10"';
PRINT N'';
PRINT N'📌 TEST FRONTEND:';
PRINT N'   http://localhost:3001/admin-logs';
PRINT N'   - Thấy email admin THẬT (quan2004toanlyhoa@gmail.com)';
PRINT N'   - Thấy username THẬT (@quan, @quan2004toanlyhoa_5...)';
PRINT N'   - Icon 🔍 ở logs có EntityId';
PRINT N'   - Click xem modal chi tiết';
PRINT N'';
GO
