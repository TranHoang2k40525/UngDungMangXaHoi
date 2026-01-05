-- ============================================
-- COMPLETE V4 DATABASE MIGRATION SCRIPT
-- Purpose: Fresh RBAC-only database (no account_type)
-- Date: 2025-12-30
-- ============================================

PRINT '===============================================';
PRINT 'UngDungMangXaHoi V4 - Clean RBAC Migration';
PRINT '===============================================';
PRINT '';

-- Step 1: Create Database
PRINT 'Step 1: Creating database ungdungmangxahoiv_4...';
:r 00_create_ungdungmangxahoiv_4.sql
GO

-- Step 2: Create Base Tables (41 tables, NO account_type)
PRINT 'Step 2: Creating base tables (WITHOUT account_type)...';
:r 00_v4_base_tables.sql
GO

-- Step 3: Create RBAC Tables (5 tables)
PRINT 'Step 3: Creating RBAC tables...';
:r create_rbac_tables.sql
GO

-- Step 4: Seed RBAC Data (3 roles, 43 permissions)
PRINT 'Step 4: Seeding RBAC data...';
:r seed_rbac_data.sql
GO

PRINT '';
PRINT '===============================================';
PRINT 'V4 Migration Complete!';
PRINT '===============================================';
PRINT 'Database: ungdungmangxahoiv_4';
PRINT 'Total tables: 46 (41 base + 5 RBAC)';
PRINT 'Roles: 3 (Admin, Business, User)';
PRINT 'Permissions: 43';
PRINT '';
PRINT 'Next steps:';
PRINT '1. Update appsettings.json connection string';
PRINT '2. Update C# code to remove account_type';
PRINT '3. Test application with RBAC';
PRINT '===============================================';
GO
