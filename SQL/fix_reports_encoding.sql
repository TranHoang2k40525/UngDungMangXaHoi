-- Fix Vietnamese encoding in Reports table
-- Delete old data with wrong encoding
DELETE FROM Reports;

-- Reset identity
DBCC CHECKIDENT ('Reports', RESEED, 0);

-- Insert new data with correct UTF-8 encoding
SET NOCOUNT ON;
GO

-- Report 1: Spam
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, created_at)
VALUES (1, 1, 'post', 1, N'Spam', N'Bài đăng quảng cáo sản phẩm không liên quan', 'pending', GETDATE());

-- Report 2: Copyright violation
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, created_at)
VALUES (1, 1, 'post', 1, N'Vi phạm bản quyền', N'Sử dụng hình ảnh không xin phép', 'pending', GETDATE());

-- Report 3: Inappropriate content
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, created_at)
VALUES (1, 1, 'post', 1, N'Nội dung không phù hợp', N'Hình ảnh bạo lực, không phù hợp với cộng đồng', 'pending', GETDATE());

GO

-- Verify data
SELECT report_id, content_type, reason, description, status, created_at
FROM Reports
ORDER BY created_at DESC;
