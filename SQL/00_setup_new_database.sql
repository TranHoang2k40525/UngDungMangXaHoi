-- ========================================
-- SETUP NEW DATABASE - ungdungmangxahoiv_3
-- Purpose: Tạo database mới và setup từ đầu
-- ========================================

USE master;
GO

-- Drop database if exists (CẢNH BÁO: Xóa toàn bộ dữ liệu)
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'ungdungmangxahoiv_3')
BEGIN
    PRINT 'Dropping existing database ungdungmangxahoiv_3...';
    ALTER DATABASE ungdungmangxahoiv_3 SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ungdungmangxahoiv_3;
    PRINT 'Database dropped successfully.';
END
GO

-- Create new database
PRINT 'Creating new database ungdungmangxahoiv_3...';
CREATE DATABASE ungdungmangxahoiv_3;
GO

PRINT 'Database ungdungmangxahoiv_3 created successfully!';
PRINT 'Next step: Run 00.sql to create all tables';
GO
