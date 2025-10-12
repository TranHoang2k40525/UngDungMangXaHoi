-- Script để cập nhật kích thước cột refresh_token trong database thực tế
-- Chạy script này trong SQL Server Management Studio hoặc Azure Data Studio

USE ungdungmangxahoiv_2;
GO

-- Kiểm tra kích thước hiện tại của cột
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'RefreshTokens' 
AND COLUMN_NAME = 'refresh_token';
GO

-- Cập nhật kích thước cột từ NVARCHAR(255) thành NVARCHAR(1000)
ALTER TABLE RefreshTokens 
ALTER COLUMN refresh_token NVARCHAR(1000) NOT NULL;
GO

-- Kiểm tra lại kích thước sau khi cập nhật
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'RefreshTokens' 
AND COLUMN_NAME = 'refresh_token';
GO

PRINT 'Cột refresh_token đã được cập nhật thành NVARCHAR(1000)';
