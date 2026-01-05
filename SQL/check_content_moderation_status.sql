-- =====================================================
-- SCRIPT KIỂM TRA DỮ LIỆU AI CONTENT MODERATION
-- Database: ungdungmangxahoiv_2
-- Table: ContentModeration (snake_case)
-- =====================================================

USE ungdungmangxahoiv_2;
GO

-- 1. Kiểm tra tổng số record trong ContentModeration
SELECT 
    COUNT(*) AS TotalRecords,
    SUM(CASE WHEN Status = 'approved' THEN 1 ELSE 0 END) AS Approved,
    SUM(CASE WHEN Status = 'blocked' THEN 1 ELSE 0 END) AS Blocked,
    SUM(CASE WHEN Status = 'rejected' THEN 1 ELSE 0 END) AS Rejected,
    SUM(CASE WHEN Status = 'pending' THEN 1 ELSE 0 END) AS Pending
FROM ContentModeration;
GO

-- 2. Kiểm tra phân bố theo ContentType
SELECT 
    ContentType,
    Status,
    COUNT(*) AS Count
FROM ContentModeration
GROUP BY ContentType, Status
ORDER BY ContentType, Status;
GO

-- 3. Xem 10 records gần nhất
SELECT TOP 10
    ModerationID,
    ContentType,
    ContentID,
    account_id,
    ToxicLabel,
    AIConfidence,
    Status,
    CreatedAt
FROM ContentModeration
ORDER BY CreatedAt DESC;
GO

-- 4. Kiểm tra Comment vi phạm gần nhất
SELECT TOP 10
    cm.ModerationID,
    cm.ContentID AS CommentId,
    c.content AS CommentContent,
    cm.ToxicLabel,
    cm.AIConfidence,
    cm.Status,
    cm.CreatedAt AS ModeratedAt,
    u.full_name AS AuthorName,
    a.email AS AuthorEmail
FROM ContentModeration cm
LEFT JOIN Comments c ON cm.ContentID = c.comment_id AND cm.ContentType = 'Comment'
LEFT JOIN Users u ON c.user_id = u.user_id
LEFT JOIN Accounts a ON u.account_id = a.account_id
WHERE cm.ContentType = 'Comment'
ORDER BY cm.CreatedAt DESC;
GO

-- 5. Đếm số người dùng vi phạm (có >= 1 vi phạm)
SELECT 
    COUNT(DISTINCT account_id) AS ViolatingUsers
FROM ContentModeration
WHERE Status IN ('blocked', 'rejected');
GO

-- 6. Top 5 người vi phạm nhiều nhất
SELECT TOP 5
    cm.account_id,
    a.email,
    u.full_name,
    COUNT(*) AS ViolationCount,
    MAX(cm.CreatedAt) AS LatestViolation
FROM ContentModeration cm
LEFT JOIN Accounts a ON cm.account_id = a.account_id
LEFT JOIN Users u ON a.account_id = u.account_id
WHERE cm.Status IN ('blocked', 'rejected')
GROUP BY cm.account_id, a.email, u.full_name
ORDER BY ViolationCount DESC;
GO

-- 7. Thống kê theo ToxicLabel
SELECT 
    ToxicLabel,
    COUNT(*) AS Count,
    AVG(AIConfidence) AS AvgConfidence
FROM ContentModeration
WHERE Status IN ('blocked', 'rejected')
GROUP BY ToxicLabel
ORDER BY Count DESC;
GO

-- 8. OPTIONAL: Sửa Status từ "blocked" sang "rejected" (nếu muốn chuẩn hóa)
-- Uncomment dòng dưới nếu muốn thống nhất Status thành "rejected"
/*
UPDATE ContentModeration 
SET Status = 'rejected' 
WHERE Status = 'blocked';
GO
*/

-- 9. Verify sau khi update (chạy sau khi uncomment query 8)
/*
SELECT Status, COUNT(*) AS Count
FROM ContentModeration
GROUP BY Status;
GO
*/

PRINT '✅ Script hoàn thành! Kiểm tra kết quả ở tab Results.';
