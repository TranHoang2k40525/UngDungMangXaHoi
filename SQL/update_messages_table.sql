-- Thêm các cột thiếu vào bảng Messages (cho 1-1 chat)

-- Thêm cột is_deleted
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Messages') 
    AND name = 'is_deleted'
)
BEGIN
    ALTER TABLE Messages ADD is_deleted BIT NOT NULL DEFAULT 0
    PRINT 'Added column is_deleted to Messages'
END
ELSE
BEGIN
    PRINT 'Column is_deleted already exists in Messages'
END

-- Thêm cột is_pinned
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Messages') 
    AND name = 'is_pinned'
)
BEGIN
    ALTER TABLE Messages ADD is_pinned BIT NOT NULL DEFAULT 0
    PRINT 'Added column is_pinned to Messages'
END
ELSE
BEGIN
    PRINT 'Column is_pinned already exists in Messages'
END

-- Thêm cột pinned_at
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Messages') 
    AND name = 'pinned_at'
)
BEGIN
    ALTER TABLE Messages ADD pinned_at DATETIME2 NULL
    PRINT 'Added column pinned_at to Messages'
END
ELSE
BEGIN
    PRINT 'Column pinned_at already exists in Messages'
END

-- Thêm cột pinned_by
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Messages') 
    AND name = 'pinned_by'
)
BEGIN
    ALTER TABLE Messages ADD pinned_by INT NULL
    PRINT 'Added column pinned_by to Messages'
END
ELSE
BEGIN
    PRINT 'Column pinned_by already exists in Messages'
END

-- Thêm cột reactions
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Messages') 
    AND name = 'reactions'
)
BEGIN
    ALTER TABLE Messages ADD reactions NVARCHAR(MAX) NULL
    PRINT 'Added column reactions to Messages'
END
ELSE
BEGIN
    PRINT 'Column reactions already exists in Messages'
END

-- Thêm cột read_by
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Messages') 
    AND name = 'read_by'
)
BEGIN
    ALTER TABLE Messages ADD read_by NVARCHAR(MAX) NULL
    PRINT 'Added column read_by to Messages'
END
ELSE
BEGIN
    PRINT 'Column read_by already exists in Messages'
END

-- Thêm cột updated_at
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Messages') 
    AND name = 'updated_at'
)
BEGIN
    ALTER TABLE Messages ADD updated_at DATETIME2 NULL
    PRINT 'Added column updated_at to Messages'
END
ELSE
BEGIN
    PRINT 'Column updated_at already exists in Messages'
END

-- Thêm cột reply_to (nếu chưa có)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Messages') 
    AND name = 'reply_to'
)
BEGIN
    ALTER TABLE Messages ADD reply_to INT NULL
    PRINT 'Added column reply_to to Messages'
END
ELSE
BEGIN
    PRINT 'Column reply_to already exists in Messages'
END

PRINT 'All columns added to Messages table!'
