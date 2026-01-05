-- =============================================
-- Fix Vietnamese Encoding in AdminActivityLogs
-- Xóa dữ liệu cũ và insert lại với encoding đúng
-- =============================================

USE [ungdungmangxahoiv_2]
GO

-- Xóa tất cả dữ liệu cũ (bị lỗi encoding)
DELETE FROM [dbo].[AdminActivityLogs];
GO

PRINT 'Deleted old records with wrong encoding';
GO

-- Insert lại với N prefix để đảm bảo Unicode
DECLARE @AdminId INT = (SELECT TOP 1 account_id FROM Accounts WHERE account_type = 'Admin');

IF @AdminId IS NOT NULL
BEGIN
    INSERT INTO [dbo].[AdminActivityLogs] 
        ([AdminAccountId], [AdminName], [AdminEmail], [Action], [EntityType], [EntityName], [Details], [IpAddress], [Status])
    VALUES
        -- Record 1: Cấm người dùng
        (@AdminId, N'Admin Test', N'admin@snap67cs.com', 
         N'Cấm người dùng', N'user', N'@testuser', 
         N'Vi phạm quy định cộng đồng', N'192.168.1.1', N'success'),
        
        -- Record 2: Xóa bài đăng
        (@AdminId, N'Admin Test', N'admin@snap67cs.com', 
         N'Xóa bài đăng vi phạm', N'post', N'Bài đăng #123', 
         N'Nội dung không phù hợp', N'192.168.1.1', N'success'),
        
        -- Record 3: Phê duyệt doanh nghiệp
        (@AdminId, N'Admin Test', N'admin@snap67cs.com', 
         N'Phê duyệt tài khoản doanh nghiệp', N'business', N'Nhà hàng ABC', 
         N'Thông tin đầy đủ và hợp lệ', N'192.168.1.1', N'success');
    
    PRINT 'Sample data with correct Vietnamese encoding inserted successfully!';
    PRINT 'Total records: 3';
END
ELSE
BEGIN
    PRINT 'ERROR: No admin account found!';
END
GO

-- Verify the data
SELECT 
    Id,
    AdminName,
    AdminEmail,
    Action,
    EntityType,
    EntityName,
    Details,
    Timestamp
FROM [dbo].[AdminActivityLogs]
ORDER BY Timestamp DESC;
GO

PRINT '✅ Vietnamese encoding fixed successfully!';
GO
