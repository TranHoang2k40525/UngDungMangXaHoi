-- =============================================
-- INSERT SAMPLE REPORTS FOR TESTING
-- Run this script AFTER FIX_REPORTS_ENCODING_FULL.sql
-- Database: ungdungmangxahoiv_2
-- =============================================

USE ungdungmangxahoiv_2;
GO

PRINT '=== Inserting Additional Sample Reports ===';
PRINT '';

-- Report 4: Hate Speech
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
    2,                                                          -- Different user
    'comment',                                                  -- Different content type
    1,
    N'Ngôn từ thù địch',
    N'Bình luận chứa từ ngữ xúc phạm, kỳ thị chủng tộc',
    'pending',
    DATEADD(HOUR, -2, GETDATE())                               -- 2 hours ago
);
PRINT 'Inserted Report 4: Ngôn từ thù địch (Comment)';

-- Report 5: Harassment
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
    2,                                                          -- Different reporter
    3,
    'post',
    2,
    N'Quấy rối',
    N'Liên tục đăng bài nhắm vào cá nhân, gây phiền nhiễu',
    'pending',
    DATEADD(DAY, -1, GETDATE())                                -- 1 day ago
);
PRINT 'Inserted Report 5: Quấy rối';

-- Report 6: Scam/Fraud
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
    3,
    'post',
    3,
    N'Lừa đảo',
    N'Bài đăng quảng cáo sản phẩm giả, lừa đảo người dùng',
    'pending',
    DATEADD(HOUR, -5, GETDATE())                               -- 5 hours ago
);
PRINT 'Inserted Report 6: Lừa đảo';

-- Report 7: Already Resolved
INSERT INTO Reports (
    reporter_id,
    reported_user_id,
    content_type,
    content_id,
    reason,
    description,
    status,
    resolved_by,
    resolved_at,
    admin_note,
    created_at
)
VALUES (
    1,
    2,
    'post',
    4,
    N'Spam',
    N'Bài đăng quảng cáo trái phép',
    'resolved',                                                 -- Already resolved
    1,                                                          -- Resolved by admin 1
    GETDATE(),
    N'Đã xóa bài đăng vi phạm',
    DATEADD(DAY, -3, GETDATE())                                -- Created 3 days ago
);
PRINT 'Inserted Report 7: Spam (Resolved)';

-- Report 8: Rejected Report
INSERT INTO Reports (
    reporter_id,
    reported_user_id,
    content_type,
    content_id,
    reason,
    description,
    status,
    resolved_by,
    resolved_at,
    admin_note,
    created_at
)
VALUES (
    2,
    1,
    'comment',
    2,
    N'Nội dung không phù hợp',
    N'Bình luận có nội dung nhạy cảm',
    'rejected',                                                 -- Rejected
    1,                                                          -- Rejected by admin 1
    GETDATE(),
    N'Không phát hiện vi phạm, nội dung trong giới hạn cho phép',
    DATEADD(DAY, -2, GETDATE())                                -- Created 2 days ago
);
PRINT 'Inserted Report 8: Nội dung không phù hợp (Rejected)';

GO

-- Verify all reports
PRINT '';
PRINT '=== Summary of All Reports ===';
PRINT '';

SELECT 
    status AS [Trạng thái],
    COUNT(*) AS [Số lượng]
FROM Reports
GROUP BY status
ORDER BY status;

PRINT '';
PRINT '=== All Reports Details ===';
PRINT '';

SELECT 
    report_id AS [ID],
    content_type AS [Loại nội dung],
    reason AS [Lý do],
    LEFT(description, 50) + '...' AS [Mô tả],
    status AS [Trạng thái],
    CASE 
        WHEN resolved_at IS NOT NULL THEN 'Đã xử lý'
        ELSE 'Chưa xử lý'
    END AS [Tình trạng],
    CONVERT(VARCHAR(20), created_at, 120) AS [Thời gian tạo]
FROM Reports
ORDER BY created_at DESC;

GO

PRINT '';
PRINT '=== SUCCESS! ===';
PRINT 'Tổng cộng đã có ' + CAST((SELECT COUNT(*) FROM Reports) AS VARCHAR(10)) + ' báo cáo trong database';
PRINT '';
PRINT 'Statistics:';
PRINT '  - Pending: ' + CAST((SELECT COUNT(*) FROM Reports WHERE status = 'pending') AS VARCHAR(10));
PRINT '  - Resolved: ' + CAST((SELECT COUNT(*) FROM Reports WHERE status = 'resolved') AS VARCHAR(10));
PRINT '  - Rejected: ' + CAST((SELECT COUNT(*) FROM Reports WHERE status = 'rejected') AS VARCHAR(10));
PRINT '';
PRINT 'Next step: Test filters in frontend';
PRINT '  1. Filter: Chờ xử lý (pending) - should show 6 reports';
PRINT '  2. Filter: Đã xử lý (resolved) - should show 1 report';
PRINT '  3. Filter: Đã từ chối (rejected) - should show 1 report';
PRINT '  4. Filter: Tất cả (all) - should show 8 reports';
GO
