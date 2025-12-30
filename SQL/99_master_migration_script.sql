-- ========================================
-- MASTER MIGRATION SCRIPT
-- Purpose: Chạy tất cả migrations theo thứ tự đúng
-- Database: ungdungmangxahoiv_3 (Database mới, không có dữ liệu)
-- ========================================

USE ungdungmangxahoiv_3;
GO

PRINT '========================================';
PRINT 'STARTING MASTER MIGRATION';
PRINT 'Database: ungdungmangxahoiv_3';
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- ========================================
-- PHASE 1: Create base tables from 00.sql
-- ========================================
PRINT 'PHASE 1: Creating base tables...';
PRINT 'Please run 00.sql separately first!';
PRINT 'Command: sqlcmd -S localhost -d ungdungmangxahoiv_3 -i SQL/00.sql';
PRINT '';

-- Check if base tables exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Accounts')
BEGIN
    PRINT 'ERROR: Base tables not found. Please run 00.sql first!';
    PRINT 'Stopping migration.';
    RETURN;
END
ELSE
BEGIN
    PRINT 'SUCCESS: Base tables found.';
END
PRINT '';

-- ========================================
-- PHASE 2: Create RBAC tables
-- ========================================
PRINT 'PHASE 2: Creating RBAC tables...';
PRINT 'Run: sqlcmd -S localhost -d ungdungmangxahoiv_3 -i SQL/create_rbac_tables.sql';
PRINT '';

-- ========================================
-- PHASE 3: Seed RBAC data
-- ========================================
PRINT 'PHASE 3: Seeding RBAC data...';
PRINT 'Run: sqlcmd -S localhost -d ungdungmangxahoiv_3 -i SQL/seed_rbac_data.sql';
PRINT '';

-- ========================================
-- PHASE 4: Migration complete
-- ========================================
PRINT '========================================';
PRINT 'MIGRATION INSTRUCTIONS';
PRINT '========================================';
PRINT '1. Run: sqlcmd -S localhost -d ungdungmangxahoiv_3 -i SQL/00.sql';
PRINT '2. Run: sqlcmd -S localhost -d ungdungmangxahoiv_3 -i SQL/create_rbac_tables.sql';
PRINT '3. Run: sqlcmd -S localhost -d ungdungmangxahoiv_3 -i SQL/seed_rbac_data.sql';
PRINT '4. (Optional) Insert test data if needed';
PRINT '5. Build and run application';
PRINT '========================================';
PRINT '';
PRINT 'Note: Since this is a NEW database, skip migrate_account_type_to_rbac.sql';
PRINT 'The application will use RBAC from the start!';
PRINT '========================================';
GO
