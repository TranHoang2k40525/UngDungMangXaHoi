-- Simple Insert Sample Reports (using first 2 users only)
USE ungdungmangxahoiv_2;
GO

-- Get first 2 users
DECLARE @user1 INT, @user2 INT;
SELECT TOP 1 @user1 = user_id FROM Users ORDER BY user_id;
SELECT TOP 1 @user2 = user_id FROM Users WHERE user_id != @user1 ORDER BY user_id;

-- Get first post
DECLARE @post1 INT;
SELECT TOP 1 @post1 = post_id FROM Posts ORDER BY post_id;

PRINT 'Inserting simple test reports...';
PRINT 'User 1: ' + CAST(@user1 AS VARCHAR);
PRINT 'User 2: ' + CAST(@user2 AS VARCHAR);
PRINT 'Post 1: ' + CAST(@post1 AS VARCHAR);

-- Insert 5 simple pending reports
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, created_at)
VALUES 
    (@user1, @user2, 'post', @post1, 'Spam', 'Quảng cáo sản phẩm không liên quan', 'pending', DATEADD(HOUR, -1, GETUTCDATE())),
    (@user1, @user2, 'post', @post1, 'Nội dung không phù hợp', 'Hình ảnh bạo lực', 'pending', DATEADD(HOUR, -2, GETUTCDATE())),
    (@user2, @user1, 'post', @post1, 'Ngôn từ thù địch', 'Từ ngữ xúc phạm', 'pending', DATEADD(HOUR, -3, GETUTCDATE())),
    (@user1, @user2, 'user', NULL, 'Quấy rối', 'Gửi tin nhắn quấy rối liên tục', 'pending', DATEADD(HOUR, -4, GETUTCDATE())),
    (@user2, @user1, 'post', @post1, 'Vi phạm bản quyền', 'Sử dụng ảnh không xin phép', 'pending', DATEADD(DAY, -1, GETUTCDATE()));

PRINT '';
PRINT 'Created 5 PENDING reports successfully!';
PRINT '';
PRINT 'Now go to Admin Dashboard and refresh the page:';
PRINT 'http://localhost:5173';
PRINT '';

-- Show reports
SELECT 
    report_id as ID,
    content_type as Type,
    reason as Reason,
    status as Status,
    CONVERT(VARCHAR, created_at, 120) as Created
FROM Reports
WHERE status = 'pending'
ORDER BY created_at DESC;

GO
