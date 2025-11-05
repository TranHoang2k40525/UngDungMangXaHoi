-- =============================================
-- Script: Tạo bảng Reactions, Shares, Notifications
-- Database: ungdungmangxahoiv_2
-- =============================================

USE ungdungmangxahoiv_2;
GO

-- =============================================
-- 1. Bảng Reactions (Cảm xúc)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Reactions')
BEGIN
    CREATE TABLE Reactions (
        reaction_id INT PRIMARY KEY IDENTITY(1,1),
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        reaction_type INT NOT NULL, -- 1=Like, 2=Love, 3=Haha, 4=Wow, 5=Sad, 6=Angry
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_Reactions_Posts FOREIGN KEY (post_id) 
            REFERENCES Posts(post_id) ON DELETE CASCADE,
        CONSTRAINT FK_Reactions_Users FOREIGN KEY (user_id) 
            REFERENCES Users(user_id) ON DELETE NO ACTION,
        CONSTRAINT UQ_Reaction_Post_User UNIQUE (post_id, user_id)
    );
    
    PRINT 'Bảng Reactions đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng Reactions đã tồn tại!';
END
GO

-- =============================================
-- 2. Bảng Shares (Chia sẻ)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Shares')
BEGIN
    CREATE TABLE Shares (
        share_id INT PRIMARY KEY IDENTITY(1,1),
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        caption NVARCHAR(2200),
        privacy NVARCHAR(50) NOT NULL DEFAULT 'public',
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_Shares_Posts FOREIGN KEY (post_id) 
            REFERENCES Posts(post_id) ON DELETE CASCADE,
        CONSTRAINT FK_Shares_Users FOREIGN KEY (user_id) 
            REFERENCES Users(user_id) ON DELETE NO ACTION
    );
    
    PRINT 'Bảng Shares đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng Shares đã tồn tại!';
END
GO

-- =============================================
-- 3. Bảng Notifications (Thông báo)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
BEGIN
    CREATE TABLE Notifications (
        notification_id INT PRIMARY KEY IDENTITY(1,1),
        user_id INT NOT NULL,
        sender_id INT,
        type INT NOT NULL, -- 1=Reaction, 2=Share, 3=Comment, 4=Follow, 5=Mention
        post_id INT,
        content NVARCHAR(500) NOT NULL,
        is_read BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_Notifications_Users FOREIGN KEY (user_id) 
            REFERENCES Users(user_id) ON DELETE CASCADE,
        CONSTRAINT FK_Notifications_Sender FOREIGN KEY (sender_id) 
            REFERENCES Users(user_id) ON DELETE NO ACTION,
        CONSTRAINT FK_Notifications_Posts FOREIGN KEY (post_id) 
            REFERENCES Posts(post_id) ON DELETE CASCADE
    );
    
    -- Tạo index để tối ưu query
    CREATE INDEX IX_Notification_UserId_IsRead_CreatedAt 
        ON Notifications(user_id, is_read, created_at);
    
    PRINT 'Bảng Notifications đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng Notifications đã tồn tại!';
END
GO

-- =============================================
-- Kiểm tra kết quả
-- =============================================
SELECT 
    t.name AS TableName,
    c.name AS ColumnName,
    ty.name AS DataType,
    c.max_length AS MaxLength,
    c.is_nullable AS IsNullable
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE t.name IN ('Reactions', 'Shares', 'Notifications')
ORDER BY t.name, c.column_id;
GO

-- =============================================
-- Thống kê dữ liệu
-- =============================================
PRINT '==========================================';
PRINT 'THỐNG KÊ DỮ LIỆU';
PRINT '==========================================';

SELECT 'Reactions' AS TableName, COUNT(*) AS RowCount FROM Reactions
UNION ALL
SELECT 'Shares', COUNT(*) FROM Shares
UNION ALL
SELECT 'Notifications', COUNT(*) FROM Notifications;
GO
