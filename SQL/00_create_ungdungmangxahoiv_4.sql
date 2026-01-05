-- ============================================
-- CREATE FRESH DATABASE: ungdungmangxahoiv_4
-- Purpose: Clean migration to RBAC system
-- Date: 2025-12-30
-- ============================================

USE master;
GO

-- Drop existing database if exists
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'ungdungmangxahoiv_4')
BEGIN
    ALTER DATABASE ungdungmangxahoiv_4 SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ungdungmangxahoiv_4;
    PRINT 'Dropped existing ungdungmangxahoiv_4';
END
GO

-- Create new database
CREATE DATABASE ungdungmangxahoiv_4;
GO

PRINT 'Created database: ungdungmangxahoiv_4';
PRINT 'Next step: Run 00_v4_base_tables.sql';
GO
