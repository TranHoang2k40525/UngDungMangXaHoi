-- Thêm cột is_deleted nếu chưa có
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('GroupMessages') 
    AND name = 'is_deleted'
)
BEGIN
    ALTER TABLE GroupMessages ADD is_deleted BIT NOT NULL DEFAULT 0
    PRINT 'Added column is_deleted to GroupMessages'
END
ELSE
BEGIN
    PRINT 'Column is_deleted already exists in GroupMessages'
END

-- Thêm cột is_pinned nếu chưa có
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('GroupMessages') 
    AND name = 'is_pinned'
)
BEGIN
    ALTER TABLE GroupMessages ADD is_pinned BIT NOT NULL DEFAULT 0
    PRINT 'Added column is_pinned to GroupMessages'
END
ELSE
BEGIN
    PRINT 'Column is_pinned already exists in GroupMessages'
END

-- Thêm cột pinned_at nếu chưa có
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('GroupMessages') 
    AND name = 'pinned_at'
)
BEGIN
    ALTER TABLE GroupMessages ADD pinned_at DATETIME2 NULL
    PRINT 'Added column pinned_at to GroupMessages'
END
ELSE
BEGIN
    PRINT 'Column pinned_at already exists in GroupMessages'
END

-- Thêm cột pinned_by nếu chưa có
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('GroupMessages') 
    AND name = 'pinned_by'
)
BEGIN
    ALTER TABLE GroupMessages ADD pinned_by INT NULL
    PRINT 'Added column pinned_by to GroupMessages'
END
ELSE
BEGIN
    PRINT 'Column pinned_by already exists in GroupMessages'
END

-- Thêm cột reactions nếu chưa có (JSON string)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('GroupMessages') 
    AND name = 'reactions'
)
BEGIN
    ALTER TABLE GroupMessages ADD reactions NVARCHAR(MAX) NULL
    PRINT 'Added column reactions to GroupMessages'
END
ELSE
BEGIN
    PRINT 'Column reactions already exists in GroupMessages'
END

-- Thêm cột read_by nếu chưa có (JSON string)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('GroupMessages') 
    AND name = 'read_by'
)
BEGIN
    ALTER TABLE GroupMessages ADD read_by NVARCHAR(MAX) NULL
    PRINT 'Added column read_by to GroupMessages'
END
ELSE
BEGIN
    PRINT 'Column read_by already exists in GroupMessages'
END

-- Thêm cột updated_at nếu chưa có
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('GroupMessages') 
    AND name = 'updated_at'
)
BEGIN
    ALTER TABLE GroupMessages ADD updated_at DATETIME2 NULL
    PRINT 'Added column updated_at to GroupMessages'
END
ELSE
BEGIN
    PRINT 'Column updated_at already exists in GroupMessages'
END

-- Kiểm tra kết quả
SELECT TOP 5 * FROM GroupMessages
