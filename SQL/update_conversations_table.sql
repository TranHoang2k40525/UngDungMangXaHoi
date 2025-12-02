-- Thêm cột created_by nếu chưa có
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Conversations') 
    AND name = 'created_by'
)
BEGIN
    ALTER TABLE Conversations ADD created_by INT NOT NULL DEFAULT 1
    PRINT 'Added column created_by to Conversations'
END
ELSE
BEGIN
    PRINT 'Column created_by already exists in Conversations'
END

-- Thêm cột invite_permission nếu chưa có
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Conversations') 
    AND name = 'invite_permission'
)
BEGIN
    ALTER TABLE Conversations ADD invite_permission NVARCHAR(20) NOT NULL DEFAULT 'all'
    PRINT 'Added column invite_permission to Conversations'
END
ELSE
BEGIN
    PRINT 'Column invite_permission already exists in Conversations'
END

-- Thêm cột max_members nếu chưa có
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Conversations') 
    AND name = 'max_members'
)
BEGIN
    ALTER TABLE Conversations ADD max_members INT NULL
    PRINT 'Added column max_members to Conversations'
END
ELSE
BEGIN
    PRINT 'Column max_members already exists in Conversations'
END

-- Kiểm tra kết quả
SELECT TOP 5 * FROM Conversations
