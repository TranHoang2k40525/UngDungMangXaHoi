-- Create Reports table for user violation reports
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Reports')
BEGIN
    CREATE TABLE Reports (
        report_id INT PRIMARY KEY IDENTITY(1,1),
        reporter_id INT NOT NULL,
        reported_user_id INT NULL,
        content_type NVARCHAR(20) NOT NULL, -- 'post', 'comment', 'user', 'message'
        content_id INT NULL,
        reason NVARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'rejected'
        admin_note NVARCHAR(500) NULL,
        resolved_by INT NULL, -- admin_id
        resolved_at DATETIMEOFFSET NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT GETUTCDATE(),
        
        FOREIGN KEY (reporter_id) REFERENCES Users(user_id),
        FOREIGN KEY (reported_user_id) REFERENCES Users(user_id),
        FOREIGN KEY (resolved_by) REFERENCES Admins(admin_id)
    );
    
    -- Index for faster queries
    CREATE INDEX IX_Reports_Status ON Reports(status);
    CREATE INDEX IX_Reports_ReporterId ON Reports(reporter_id);
    CREATE INDEX IX_Reports_ReportedUserId ON Reports(reported_user_id);
    CREATE INDEX IX_Reports_CreatedAt ON Reports(created_at DESC);
    
    PRINT 'Reports table created successfully';
END
ELSE
BEGIN
    PRINT 'Reports table already exists';
END
GO

-- Insert sample data for testing
INSERT INTO Reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status, created_at)
VALUES 
    (1, 2, 'post', 1, 'Nội dung không phù hợp', 'Bài đăng chứa hình ảnh bạo lực', 'pending', DATEADD(DAY, -2, GETUTCDATE())),
    (3, 4, 'comment', 5, 'Spam', 'Comment lặp đi lặp lại nhiều lần', 'pending', DATEADD(DAY, -1, GETUTCDATE())),
    (5, 2, 'post', 3, 'Ngôn từ thù địch', 'Sử dụng từ ngữ xúc phạm dân tộc', 'pending', DATEADD(HOUR, -5, GETUTCDATE())),
    (2, 6, 'user', NULL, 'Vi phạm bản quyền', 'Đăng lại nội dung của người khác', 'resolved', DATEADD(DAY, -10, GETUTCDATE())),
    (7, 8, 'comment', 12, 'Spam', 'Quảng cáo sản phẩm không liên quan', 'rejected', DATEADD(DAY, -15, GETUTCDATE()));

PRINT 'Sample reports inserted';
GO
