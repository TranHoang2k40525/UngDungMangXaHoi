-- ====================================================================
-- SỬA LỖI ENCODING TIẾNG VIỆT - ADMIN ACTIVITY LOGS
-- Database: ungdungmangxahoiv_2
-- Vấn đề: Tiếng Việt bị lỗi font (HoÃ ng, Giáº£i...)
-- Giải pháp: Thêm N prefix trước string literals
-- ====================================================================

USE ungdungmangxahoiv_2;
GO

-- Bước 1: XÓA TOÀN BỘ logs cũ (bị lỗi encoding)
DELETE FROM AdminActivityLogs;
PRINT '✅ Đã xóa ' + CAST(@@ROWCOUNT AS NVARCHAR) + ' logs cũ';
GO

-- Bước 2: KIỂM TRA dữ liệu có sẵn
PRINT '';
PRINT '=== KIỂM TRA DỮ LIỆU ===';
SELECT 
    'Users' AS [Bảng], 
    COUNT(*) AS [Số lượng],
    MIN(user_id) AS [ID đầu],
    MAX(user_id) AS [ID cuối]
FROM Users
UNION ALL
SELECT 'Posts', COUNT(*), MIN(post_id), MAX(post_id) FROM Posts
UNION ALL
SELECT 'Comments', COUNT(*), MIN(comment_id), MAX(comment_id) FROM Comments
UNION ALL
SELECT 'Reports', COUNT(*), MIN(report_id), MAX(report_id) FROM Reports;
GO

-- Bước 3: TẠO LOGS MỚI với N prefix (Unicode)
-- Admin Account ID = 5 (từ database thật)

PRINT '';
PRINT '=== TẠO LOGS MỚI ===';
GO

-- 3.1. LOG CHO USER
DECLARE @AdminAccountId INT = 5;
DECLARE @UserId INT, @UserName NVARCHAR(100);

SELECT TOP 1 @UserId = user_id, @UserName = username FROM Users ORDER BY user_id;

IF @UserId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType, 
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin Nguyễn Văn A',  -- ✅ N prefix cho tiếng Việt
        N'quan2004toanlyhoa@gmail.com',
        N'Cấm người dùng',  -- ✅ N prefix
        N'user',
        @UserId,
        N'@' + @UserName,  -- ✅ N prefix
        N'Vi phạm quy định cộng đồng - Đăng spam liên tục',  -- ✅ N prefix
        N'192.168.1.100',
        N'success',
        DATEADD(HOUR, -2, GETDATE())
    );
    PRINT '✅ Tạo log: Cấm người dùng @' + @UserName;
END
ELSE
    PRINT '❌ Không có User trong database';
GO

-- 3.2. LOG CHO POST
DECLARE @AdminAccountId INT = 5;
DECLARE @PostId INT;

SELECT TOP 1 @PostId = post_id FROM Posts ORDER BY post_id;

IF @PostId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin Trần Thị B',  -- ✅ N prefix
        N'quan2004toanlyhoa@gmail.com',
        N'Xóa bài đăng vi phạm',  -- ✅ N prefix
        N'post',
        @PostId,
        N'Bài đăng #' + CAST(@PostId AS NVARCHAR),  -- ✅ N prefix
        N'Nội dung không phù hợp - Chứa ngôn từ công kích người khác',  -- ✅ N prefix
        N'192.168.1.101',
        N'success',
        DATEADD(HOUR, -5, GETDATE())
    );
    PRINT '✅ Tạo log: Xóa bài đăng #' + CAST(@PostId AS NVARCHAR);
END
ELSE
    PRINT '❌ Không có Post trong database';
GO

-- 3.3. LOG CHO COMMENT
DECLARE @AdminAccountId INT = 5;
DECLARE @CommentId INT;

SELECT TOP 1 @CommentId = comment_id FROM Comments ORDER BY comment_id;

IF @CommentId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin Lê Văn C',  -- ✅ N prefix
        N'quan2004toanlyhoa@gmail.com',
        N'Ẩn bình luận',  -- ✅ N prefix
        N'comment',
        @CommentId,
        N'Bình luận #' + CAST(@CommentId AS NVARCHAR),  -- ✅ N prefix
        N'Bình luận chứa ngôn từ thù địch, kích động bạo lực',  -- ✅ N prefix
        N'192.168.1.102',
        N'success',
        DATEADD(HOUR, -8, GETDATE())
    );
    PRINT '✅ Tạo log: Ẩn bình luận #' + CAST(@CommentId AS NVARCHAR);
END
ELSE
    PRINT '❌ Không có Comment trong database';
GO

-- 3.4. LOG CHO REPORT
DECLARE @AdminAccountId INT = 5;
DECLARE @ReportId INT;

SELECT TOP 1 @ReportId = report_id FROM Reports ORDER BY report_id;

IF @ReportId IS NOT NULL
BEGIN
    INSERT INTO AdminActivityLogs (
        AdminAccountId, AdminName, AdminEmail, Action, EntityType,
        EntityId, EntityName, Details, IpAddress, Status, Timestamp
    )
    VALUES (
        @AdminAccountId,
        N'Admin Hoàng Văn E',  -- ✅ N prefix
        N'quan2004toanlyhoa@gmail.com',
        N'Giải quyết báo cáo',  -- ✅ N prefix
        N'report',
        @ReportId,
        N'Báo cáo #' + CAST(@ReportId AS NVARCHAR),  -- ✅ N prefix
        N'Đã xử lý vi phạm - Cấm người dùng 7 ngày',  -- ✅ N prefix
        N'192.168.1.104',
        N'success',
        DATEADD(HOUR, -1, GETDATE())
    );
    PRINT '✅ Tạo log: Giải quyết báo cáo #' + CAST(@ReportId AS NVARCHAR);
END
ELSE
    PRINT '❌ Không có Report trong database';
GO

-- 3.5. LOGS HỆ THỐNG (System logs)
DECLARE @AdminAccountId INT = 5;

INSERT INTO AdminActivityLogs (
    AdminAccountId, AdminName, AdminEmail, Action, EntityType,
    EntityId, EntityName, Details, IpAddress, Status, Timestamp
)
VALUES 
(
    @AdminAccountId,
    N'System',
    N'system@snap67cs.com',
    N'Sao lưu dữ liệu',  -- ✅ N prefix
    N'system',
    NULL,
    N'Database Backup',
    N'Sao lưu tự động hàng ngày vào 02:00 AM',  -- ✅ N prefix
    N'127.0.0.1',
    N'success',
    DATEADD(DAY, -1, GETDATE())
),
(
    @AdminAccountId,
    N'Admin Nguyễn Văn A',
    N'quan2004toanlyhoa@gmail.com',
    N'Cập nhật cài đặt hệ thống',  -- ✅ N prefix
    N'system',
    NULL,
    N'System Settings',
    N'Thay đổi giới hạn upload file: 10MB → 20MB',  -- ✅ N prefix
    N'192.168.1.100',
    N'success',
    DATEADD(HOUR, -3, GETDATE())
);

PRINT '✅ Tạo 2 logs hệ thống';
GO

-- Bước 4: KIỂM TRA KẾT QUẢ
PRINT '';
PRINT '=== KẾT QUẢ CUỐI CÙNG ===';
SELECT 
    COUNT(*) AS [Tổng logs],
    SUM(CASE WHEN EntityId IS NOT NULL THEN 1 ELSE 0 END) AS [Có EntityId],
    SUM(CASE WHEN EntityId IS NULL THEN 1 ELSE 0 END) AS [Không có EntityId]
FROM AdminActivityLogs;

PRINT '';
PRINT '=== TOP 10 LOGS MỚI NHẤT ===';
SELECT TOP 10
    Id,
    AdminName,
    Action,
    EntityType,
    EntityId,
    EntityName,
    Details,
    Status,
    CONVERT(VARCHAR, Timestamp, 120) AS [Thời gian]
FROM AdminActivityLogs
ORDER BY Timestamp DESC;
GO

PRINT '';
PRINT '========================================';
PRINT '✅ HOÀN TẤT! DỮ LIỆU TIẾNG VIỆT CHUẨN!';
PRINT '========================================';
PRINT '';
PRINT '📋 HƯỚNG DẪN TEST:';
PRINT '1. Mở terminal mới và chạy:';
PRINT '   curl "http://localhost:5297/api/admin/activity-logs?page=1&pageSize=10"';
PRINT '';
PRINT '2. Kiểm tra JSON response - phải thấy tiếng Việt ĐÚNG:';
PRINT '   - "Cấm người dùng" (không phải "Cáº¥m...")';
PRINT '   - "Nguyễn Văn A" (không phải "Nguyá»…n...")';
PRINT '';
PRINT '3. Mở browser: http://localhost:3001/admin-logs';
PRINT '   - Thấy tiếng Việt hiển thị CHUẨN';
PRINT '   - Icon 🔍 hiện ở logs có EntityId';
PRINT '   - Hover thấy cursor: pointer';
PRINT '   - Click mở modal chi tiết';
PRINT '';
GO
