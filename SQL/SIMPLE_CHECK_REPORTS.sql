-- =============================================
-- SIMPLE QUERY TO CHECK REPORTS DATA
-- Copy and run this in a NEW QUERY window in SSMS
-- =============================================

USE ungdungmangxahoiv_2;
GO

-- Simple SELECT to check data
SELECT 
    report_id,
    content_type,
    reason,
    description,
    status,
    created_at
FROM Reports
ORDER BY report_id;

-- This will show Vietnamese correctly in SSMS Results tab!
-- If you see correct Vietnamese here, then data is CORRECT!
-- The console (Messages tab) always shows wrong encoding, ignore it!
