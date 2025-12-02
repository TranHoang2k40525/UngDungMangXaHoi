-- Cập nhật bảng Comments để thêm các cột còn thiếu

-- Thêm cột hashtags nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Comments]') AND name = 'hashtags')
BEGIN
    ALTER TABLE [dbo].[Comments] ADD [hashtags] [nvarchar](500) NULL
    PRINT 'Đã thêm cột hashtags'
END

-- Thêm cột likes_count nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Comments]') AND name = 'likes_count')
BEGIN
    ALTER TABLE [dbo].[Comments] ADD [likes_count] [int] NOT NULL DEFAULT 0
    PRINT 'Đã thêm cột likes_count'
END

-- Thêm cột replies_count nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Comments]') AND name = 'replies_count')
BEGIN
    ALTER TABLE [dbo].[Comments] ADD [replies_count] [int] NOT NULL DEFAULT 0
    PRINT 'Đã thêm cột replies_count'
END

-- Thêm cột mentioned_user_ids nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Comments]') AND name = 'mentioned_user_ids')
BEGIN
    ALTER TABLE [dbo].[Comments] ADD [mentioned_user_ids] [nvarchar](500) NULL
    PRINT 'Đã thêm cột mentioned_user_ids'
END

-- Thêm cột updated_at nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Comments]') AND name = 'updated_at')
BEGIN
    ALTER TABLE [dbo].[Comments] ADD [updated_at] [datetime] NULL
    PRINT 'Đã thêm cột updated_at'
END

-- Thêm cột is_deleted nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Comments]') AND name = 'is_deleted')
BEGIN
    ALTER TABLE [dbo].[Comments] ADD [is_deleted] [bit] NOT NULL DEFAULT 0
    PRINT 'Đã thêm cột is_deleted'
END

-- Thêm cột is_edited nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Comments]') AND name = 'is_edited')
BEGIN
    ALTER TABLE [dbo].[Comments] ADD [is_edited] [bit] NOT NULL DEFAULT 0
    PRINT 'Đã thêm cột is_edited'
END

PRINT '=== Hoàn thành cập nhật bảng Comments ==='
