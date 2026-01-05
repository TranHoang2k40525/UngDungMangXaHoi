-- =============================================
-- Create Admin Activity Logs Table
-- Bảng lưu trữ nhật ký hoạt động của Admin
-- =============================================

USE [ungdungmangxahoiv_2]
GO

-- Drop table nếu đã tồn tại (chỉ dùng khi dev)
IF OBJECT_ID('dbo.AdminActivityLogs', 'U') IS NOT NULL
    DROP TABLE dbo.AdminActivityLogs;
GO

CREATE TABLE [dbo].[AdminActivityLogs]
(
    [Id] INT IDENTITY(1,1) NOT NULL,
    [AdminAccountId] INT NOT NULL,
    [AdminName] NVARCHAR(200) NOT NULL,
    [AdminEmail] NVARCHAR(200) NOT NULL,
    [Action] NVARCHAR(500) NOT NULL,
    [EntityType] NVARCHAR(50) NOT NULL,
    [EntityId] INT NULL,
    [EntityName] NVARCHAR(500) NULL,
    [Details] NVARCHAR(2000) NULL,
    [IpAddress] NVARCHAR(50) NULL,
    [Status] NVARCHAR(20) NOT NULL DEFAULT 'success',
    [Timestamp] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [AdditionalData] NVARCHAR(MAX) NULL,
    
    CONSTRAINT [PK_AdminActivityLogs] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_AdminActivityLogs_Accounts] FOREIGN KEY ([AdminAccountId])
        REFERENCES [dbo].[Accounts]([account_id]) ON DELETE NO ACTION
);
GO

-- Tạo indexes cho performance tốt hơn
CREATE NONCLUSTERED INDEX [IX_AdminActivityLogs_AdminAccountId]
    ON [dbo].[AdminActivityLogs] ([AdminAccountId] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_AdminActivityLogs_AdminEmail]
    ON [dbo].[AdminActivityLogs] ([AdminEmail] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_AdminActivityLogs_EntityType]
    ON [dbo].[AdminActivityLogs] ([EntityType] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_AdminActivityLogs_Timestamp]
    ON [dbo].[AdminActivityLogs] ([Timestamp] DESC);
GO

CREATE NONCLUSTERED INDEX [IX_AdminActivityLogs_Status]
    ON [dbo].[AdminActivityLogs] ([Status] ASC);
GO

-- Composite index cho query phổ biến
CREATE NONCLUSTERED INDEX [IX_AdminActivityLogs_EntityType_Timestamp]
    ON [dbo].[AdminActivityLogs] ([EntityType] ASC, [Timestamp] DESC);
GO

CREATE NONCLUSTERED INDEX [IX_AdminActivityLogs_AdminEmail_Timestamp]
    ON [dbo].[AdminActivityLogs] ([AdminEmail] ASC, [Timestamp] DESC);
GO

PRINT 'Admin Activity Logs table created successfully!';
GO

-- =============================================
-- Insert sample data để test
-- =============================================

DECLARE @AdminId INT = (SELECT TOP 1 account_id FROM Accounts WHERE account_type = 'Admin');

IF @AdminId IS NOT NULL
BEGIN
    -- Xóa dữ liệu cũ nếu có (để tránh duplicate khi chạy lại script)
    DELETE FROM [dbo].[AdminActivityLogs] WHERE AdminAccountId = @AdminId;
    
    -- Insert với N prefix để hỗ trợ Unicode tiếng Việt
    INSERT INTO [dbo].[AdminActivityLogs] 
        ([AdminAccountId], [AdminName], [AdminEmail], [Action], [EntityType], [EntityName], [Details], [IpAddress], [Status])
    VALUES
        (@AdminId, N'Admin Test', 'admin@snap67cs.com', N'Cấm người dùng', 'user', N'@testuser', N'Vi phạm quy định cộng đồng', '192.168.1.1', 'success'),
        (@AdminId, N'Admin Test', 'admin@snap67cs.com', N'Xóa bài đăng vi phạm', 'post', N'Bài đăng #123', N'Nội dung không phù hợp', '192.168.1.1', 'success'),
        (@AdminId, N'Admin Test', 'admin@snap67cs.com', N'Phê duyệt tài khoản doanh nghiệp', 'business', N'Nhà hàng ABC', N'Thông tin đầy đủ và hợp lệ', '192.168.1.1', 'success');
    
    PRINT 'Sample data inserted successfully with proper UTF-8 encoding!';
END
ELSE
BEGIN
    PRINT 'No admin account found. Skipping sample data insertion.';
END
GO
