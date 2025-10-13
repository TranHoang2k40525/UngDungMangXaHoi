-- Script để sửa database thiếu cột username
USE ungdungmangxahoiv_2;
GO

-- Kiểm tra xem cột username có tồn tại không
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'username')
BEGIN
    -- Thêm cột username nếu chưa có
    ALTER TABLE Users ADD username NVARCHAR(50) UNIQUE NOT NULL DEFAULT 'user_' + CAST(NEWID() AS NVARCHAR(36));
    
    -- Cập nhật giá trị username cho các record hiện có
    UPDATE Users 
    SET username = 'user_' + CAST(user_id AS NVARCHAR(10))
    WHERE username LIKE 'user_%' OR username IS NULL;
    
    PRINT 'Added username column to Users table';
END
ELSE
BEGIN
    PRINT 'Username column already exists in Users table';
END

-- Kiểm tra và tạo index cho username nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE name = 'IX_Users_Username' AND object_id = OBJECT_ID('Users'))
BEGIN
    CREATE UNIQUE INDEX IX_Users_Username ON Users(username);
    PRINT 'Created unique index on username column';
END
ELSE
BEGIN
    PRINT 'Username index already exists';
END

-- Kiểm tra các cột khác có thể thiếu
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'full_name')
BEGIN
    ALTER TABLE Users ADD full_name NVARCHAR(100);
    PRINT 'Added full_name column to Users table';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'date_of_birth')
BEGIN
    ALTER TABLE Users ADD date_of_birth DATE;
    PRINT 'Added date_of_birth column to Users table';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'gender')
BEGIN
    ALTER TABLE Users ADD gender NVARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other'));
    PRINT 'Added gender column to Users table';
END

PRINT 'Database fix completed successfully!';
