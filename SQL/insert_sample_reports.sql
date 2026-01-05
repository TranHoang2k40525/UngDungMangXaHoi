-- Insert Sample Reports Data for Testing
-- Run this to create test reports in the database

USE ungdungmangxahoiv_2;
GO

-- First, check if we have users
DECLARE @user1 INT, @user2 INT, @user3 INT, @user4 INT;

SELECT TOP 1 @user1 = user_id FROM Users ORDER BY user_id;
SELECT @user2 = user_id FROM Users WHERE user_id > @user1 ORDER BY user_id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;
SELECT @user3 = user_id FROM Users WHERE user_id > @user2 ORDER BY user_id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;
SELECT @user4 = user_id FROM Users WHERE user_id > @user3 ORDER BY user_id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;

-- Get some post IDs
DECLARE @post1 INT, @post2 INT, @post3 INT;
SELECT TOP 1 @post1 = post_id FROM Posts ORDER BY post_id;
SELECT @post2 = post_id FROM Posts WHERE post_id > @post1 ORDER BY post_id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;
SELECT @post3 = post_id FROM Posts WHERE post_id > @post2 ORDER BY post_id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;

-- Get some comment IDs (use lowercase column name)
DECLARE @comment1 INT, @comment2 INT;
SELECT TOP 1 @comment1 = comment_id FROM Comments ORDER BY comment_id;
SELECT @comment2 = comment_id FROM Comments WHERE comment_id > @comment1 ORDER BY comment_id OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;

PRINT 'Creating sample reports...';
PRINT 'Using users: ' + CAST(@user1 AS VARCHAR) + ', ' + CAST(@user2 AS VARCHAR) + ', ' + CAST(@user3 AS VARCHAR);
PRINT 'Using posts: ' + CAST(@post1 AS VARCHAR) + ', ' + CAST(@post2 AS VARCHAR);

-- Insert sample reports
-- Report 1: Spam post - PENDING
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, created_at)
VALUES (@user1, @user2, 'post', @post1, 'Spam', 'Bài đăng quảng cáo sản phẩm không liên quan', 'pending', DATEADD(HOUR, -2, GETUTCDATE()));

-- Report 2: Inappropriate content - PENDING
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, created_at)
VALUES (@user2, @user3, 'post', @post2, 'Nội dung không phù hợp', 'Bài đăng chứa hình ảnh bạo lực', 'pending', DATEADD(HOUR, -5, GETUTCDATE()));

-- Report 3: Hate speech comment - PENDING
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, created_at)
VALUES (@user3, @user2, 'comment', @comment1, 'Ngôn từ thù địch', 'Bình luận xúc phạm dân tộc', 'pending', DATEADD(DAY, -1, GETUTCDATE()));

-- Report 4: Copyright violation - PENDING
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, created_at)
VALUES (@user1, @user3, 'post', @post3, 'Vi phạm bản quyền', 'Đăng lại nội dung của người khác không xin phép', 'pending', DATEADD(DAY, -2, GETUTCDATE()));

-- Report 5: Spam comment - PENDING
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, created_at)
VALUES (@user4, @user1, 'comment', @comment2, 'Spam', 'Bình luận lặp đi lặp lại nhiều lần', 'pending', DATEADD(HOUR, -10, GETUTCDATE()));

-- Report 6: Harassment - PENDING
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, created_at)
VALUES (@user2, @user4, 'user', NULL, 'Quấy rối', 'Liên tục gửi tin nhắn quấy rối', 'pending', DATEADD(HOUR, -3, GETUTCDATE()));

-- Report 7: Already resolved - RESOLVED (for testing filter)
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, admin_note, created_at, resolved_at)
VALUES (@user3, @user1, 'post', @post1, 'Spam', 'Quảng cáo', 'resolved', 'Đã xử lý - xóa bài đăng', DATEADD(DAY, -5, GETUTCDATE()), DATEADD(DAY, -4, GETUTCDATE()));

-- Report 8: Rejected - REJECTED (for testing filter)
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, admin_note, created_at, resolved_at)
VALUES (@user1, @user2, 'comment', @comment1, 'Nội dung không phù hợp', 'Bình luận không đúng', 'rejected', 'Không phát hiện vi phạm', DATEADD(DAY, -7, GETUTCDATE()), DATEADD(DAY, -6, GETUTCDATE()));

PRINT 'Sample reports created successfully!';
PRINT '';
PRINT 'Summary:';
PRINT '- 6 PENDING reports (ready to process)';
PRINT '- 1 RESOLVED report';
PRINT '- 1 REJECTED report';
PRINT '';
PRINT 'Now refresh your admin dashboard to see the reports!';

-- Show created reports
SELECT 
    report_id,
    content_type as 'Type',
    reason as 'Reason',
    status as 'Status',
    created_at as 'Created',
    description as 'Description'
FROM Reports
ORDER BY created_at DESC;

GO
