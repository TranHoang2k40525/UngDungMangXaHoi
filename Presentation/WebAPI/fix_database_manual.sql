-- Manual fix for database schema issues
USE ungdungmangxahoiv_2;
GO

-- Check if username column exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'username')
BEGIN
    PRINT 'Adding username column...';
    ALTER TABLE Users ADD username NVARCHAR(50);
    
    -- Update existing records with default username
    UPDATE Users 
    SET username = 'user_' + CAST(user_id AS NVARCHAR(10))
    WHERE username IS NULL;
    
    -- Make username NOT NULL and UNIQUE
    ALTER TABLE Users ALTER COLUMN username NVARCHAR(50) NOT NULL;
    CREATE UNIQUE INDEX IX_Users_Username ON Users(username);
    
    PRINT 'Username column added successfully';
END
ELSE
BEGIN
    PRINT 'Username column already exists';
END

-- Check if other required columns exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'full_name')
BEGIN
    PRINT 'Adding full_name column...';
    ALTER TABLE Users ADD full_name NVARCHAR(100);
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'date_of_birth')
BEGIN
    PRINT 'Adding date_of_birth column...';
    ALTER TABLE Users ADD date_of_birth DATE;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'gender')
BEGIN
    PRINT 'Adding gender column...';
    ALTER TABLE Users ADD gender NVARCHAR(10);
END

PRINT 'Database schema fix completed!';
