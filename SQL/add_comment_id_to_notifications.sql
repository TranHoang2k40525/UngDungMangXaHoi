-- Thêm cột comment_id vào bảng Notifications
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND name = 'comment_id')
BEGIN
    ALTER TABLE [dbo].[Notifications] ADD [comment_id] [int] NULL
    PRINT 'Đã thêm cột comment_id vào bảng Notifications'
END
ELSE
BEGIN
    PRINT 'Cột comment_id đã tồn tại trong bảng Notifications'
END
