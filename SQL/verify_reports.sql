-- Verify Reports data in SSMS
SELECT 
    report_id,
    content_type,
    reason,
    description,
    status,
    created_at
FROM Reports
ORDER BY report_id;

-- Expected results trong SSMS:
-- report_id  reason                    description
-- 1          Spam                      Bài đăng quảng cáo sản phẩm không liên quan
-- 2          Vi phạm bản quyền         Sử dụng hình ảnh không xin phép
-- 3          Nội dung không phù hợp    Hình ảnh bạo lực không phù hợp
