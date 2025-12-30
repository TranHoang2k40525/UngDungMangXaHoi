-- Copy schema from ungdungmangxahoiv_2 to ungdungmangxahoiv_3
-- This script will generate CREATE TABLE statements

USE ungdungmangxahoiv_3;
GO

-- Since 00.sql uses ungdungmangxahoiv_2 hardcoded, 
-- we'll run it with string replacement

DECLARE @sql NVARCHAR(MAX);

-- Read from file 00.sql and execute with database _3
PRINT 'Please run this command in PowerShell:';
PRINT '(Get-Content SQL\00.sql) -replace ''ungdungmangxahoiv_2'', ''ungdungmangxahoiv_3'' | sqlcmd -S localhost';
GO
