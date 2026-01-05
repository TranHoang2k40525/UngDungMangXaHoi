-- ========================================
-- MIGRATE ACCOUNT_TYPE TO RBAC
-- Purpose: Chuyển dữ liệu từ account_type sang hệ thống RBAC
-- ========================================

BEGIN TRANSACTION;

PRINT '========================================';
PRINT 'Starting migration from account_type to RBAC...';
PRINT '========================================';
PRINT '';

-- ========================================
-- STEP 1: Validate Prerequisites
-- ========================================
PRINT 'STEP 1: Validating prerequisites...';

-- Check if RBAC tables exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
BEGIN
    PRINT 'ERROR: Roles table does not exist. Please run create_rbac_tables.sql first.';
    ROLLBACK TRANSACTION;
    RETURN;
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Permissions')
BEGIN
    PRINT 'ERROR: Permissions table does not exist. Please run create_rbac_tables.sql first.';
    ROLLBACK TRANSACTION;
    RETURN;
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AccountRoles')
BEGIN
    PRINT 'ERROR: AccountRoles table does not exist. Please run create_rbac_tables.sql first.';
    ROLLBACK TRANSACTION;
    RETURN;
END

-- Check if roles are seeded
IF NOT EXISTS (SELECT * FROM [dbo].[Roles] WHERE role_name IN ('Admin', 'User', 'Business'))
BEGIN
    PRINT 'ERROR: Roles not seeded. Please run seed_rbac_data.sql first.';
    ROLLBACK TRANSACTION;
    RETURN;
END

PRINT 'Prerequisites validated successfully.';
PRINT '';

-- ========================================
-- STEP 2: Backup current state
-- ========================================
PRINT 'STEP 2: Creating backup of current state...';

-- Get counts before migration
DECLARE @AdminCount INT = (SELECT COUNT(*) FROM [dbo].[Accounts] WHERE account_type = 'Admin');
DECLARE @UserCount INT = (SELECT COUNT(*) FROM [dbo].[Accounts] WHERE account_type = 'User');
DECLARE @BusinessCount INT = (SELECT COUNT(*) FROM [dbo].[Accounts] WHERE account_type = 'Business');

PRINT 'Current account distribution:';
PRINT '  Admin accounts: ' + CAST(@AdminCount AS VARCHAR);
PRINT '  User accounts: ' + CAST(@UserCount AS VARCHAR);
PRINT '  Business accounts: ' + CAST(@BusinessCount AS VARCHAR);
PRINT '';

-- ========================================
-- STEP 3: Clear existing AccountRoles (for re-migration)
-- ========================================
PRINT 'STEP 3: Clearing existing AccountRoles...';
DELETE FROM [dbo].[AccountRoles];
PRINT 'Cleared existing AccountRoles.';
PRINT '';

-- ========================================
-- STEP 4: Migrate Admin accounts
-- ========================================
PRINT 'STEP 4: Migrating Admin accounts...';

INSERT INTO [dbo].[AccountRoles] ([account_id], [role_id], [assigned_at], [expires_at], [is_active], [assigned_by])
SELECT 
    a.account_id,
    (SELECT role_id FROM [dbo].[Roles] WHERE role_name = 'Admin'),
    a.created_at,
    NULL, -- Admin role never expires
    1, -- is_active
    'SYSTEM_MIGRATION'
FROM [dbo].[Accounts] a
WHERE a.account_type = 'Admin';

DECLARE @MigratedAdmins INT = @@ROWCOUNT;
PRINT 'Migrated ' + CAST(@MigratedAdmins AS VARCHAR) + ' Admin accounts.';
PRINT '';

-- ========================================
-- STEP 5: Migrate User accounts (non-Business)
-- ========================================
PRINT 'STEP 5: Migrating User accounts...';

INSERT INTO [dbo].[AccountRoles] ([account_id], [role_id], [assigned_at], [expires_at], [is_active], [assigned_by])
SELECT 
    a.account_id,
    (SELECT role_id FROM [dbo].[Roles] WHERE role_name = 'User'),
    a.created_at,
    NULL, -- User role never expires
    1, -- is_active
    'SYSTEM_MIGRATION'
FROM [dbo].[Accounts] a
WHERE a.account_type = 'User';

DECLARE @MigratedUsers INT = @@ROWCOUNT;
PRINT 'Migrated ' + CAST(@MigratedUsers AS VARCHAR) + ' User accounts.';
PRINT '';

-- ========================================
-- STEP 6: Migrate Business accounts
-- ========================================
PRINT 'STEP 6: Migrating Business accounts...';

-- Business accounts get both User role AND Business role
-- First, add User role to all Business accounts
INSERT INTO [dbo].[AccountRoles] ([account_id], [role_id], [assigned_at], [expires_at], [is_active], [assigned_by])
SELECT 
    a.account_id,
    (SELECT role_id FROM [dbo].[Roles] WHERE role_name = 'User'),
    a.created_at,
    NULL, -- Base User role never expires
    1, -- is_active
    'SYSTEM_MIGRATION'
FROM [dbo].[Accounts] a
WHERE a.account_type = 'Business';

PRINT 'Added User role to Business accounts.';

-- Then, add Business role with expiration
INSERT INTO [dbo].[AccountRoles] ([account_id], [role_id], [assigned_at], [expires_at], [is_active], [assigned_by])
SELECT 
    a.account_id,
    (SELECT role_id FROM [dbo].[Roles] WHERE role_name = 'Business'),
    ISNULL(a.business_verified_at, a.created_at), -- Use verification date if available
    a.business_expires_at, -- Keep expiration date
    CASE 
        WHEN a.business_expires_at IS NULL OR a.business_expires_at > GETUTCDATE() THEN 1 
        ELSE 0 
    END, -- is_active based on expiration
    'SYSTEM_MIGRATION'
FROM [dbo].[Accounts] a
WHERE a.account_type = 'Business';

DECLARE @MigratedBusiness INT = @@ROWCOUNT;
PRINT 'Migrated ' + CAST(@MigratedBusiness AS VARCHAR) + ' Business accounts (with User + Business roles).';
PRINT '';

-- ========================================
-- STEP 7: Validation
-- ========================================
PRINT 'STEP 7: Validating migration...';

-- Count migrated roles
DECLARE @TotalAccountRoles INT = (SELECT COUNT(*) FROM [dbo].[AccountRoles]);
DECLARE @TotalAccounts INT = (SELECT COUNT(*) FROM [dbo].[Accounts] WHERE status = 'active');

PRINT 'Migration Results:';
PRINT '  Total AccountRoles created: ' + CAST(@TotalAccountRoles AS VARCHAR);
PRINT '  Expected minimum (1 role per account): ' + CAST(@TotalAccounts AS VARCHAR);

-- Check for accounts without roles
DECLARE @AccountsWithoutRoles INT = (
    SELECT COUNT(*)
    FROM [dbo].[Accounts] a
    LEFT JOIN [dbo].[AccountRoles] ar ON a.account_id = ar.account_id
    WHERE ar.account_role_id IS NULL AND a.status = 'active'
);

IF @AccountsWithoutRoles > 0
BEGIN
    PRINT 'WARNING: ' + CAST(@AccountsWithoutRoles AS VARCHAR) + ' active accounts do not have roles assigned!';
    
    -- Show accounts without roles
    SELECT TOP 10 
        a.account_id, 
        a.email, 
        a.account_type, 
        a.status
    FROM [dbo].[Accounts] a
    LEFT JOIN [dbo].[AccountRoles] ar ON a.account_id = ar.account_id
    WHERE ar.account_role_id IS NULL AND a.status = 'active';
END
ELSE
BEGIN
    PRINT 'SUCCESS: All active accounts have roles assigned.';
END

PRINT '';

-- Role distribution after migration
PRINT 'Role distribution after migration:';
SELECT 
    r.role_name AS [Role],
    COUNT(DISTINCT ar.account_id) AS [Account Count],
    COUNT(ar.account_role_id) AS [Role Assignments]
FROM [dbo].[Roles] r
LEFT JOIN [dbo].[AccountRoles] ar ON r.role_id = ar.role_id
GROUP BY r.role_name, r.priority
ORDER BY r.priority DESC;

PRINT '';

-- ========================================
-- STEP 8: Create indexes for performance
-- ========================================
PRINT 'STEP 8: Checking indexes...';

-- Indexes already created in create_rbac_tables.sql
-- Just validate they exist
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AccountRoles_AccountId')
    PRINT 'Index IX_AccountRoles_AccountId exists.';
ELSE
    PRINT 'WARNING: Index IX_AccountRoles_AccountId is missing!';

PRINT '';

-- ========================================
-- STEP 9: Migration complete
-- ========================================
COMMIT TRANSACTION;

PRINT '========================================';
PRINT 'Migration completed successfully!';
PRINT '========================================';
PRINT '';
PRINT 'IMPORTANT NOTES:';
PRINT '1. The account_type column is kept for backward compatibility';
PRINT '2. New code should use AccountRoles instead of account_type';
PRINT '3. You can now update your application to use RBAC';
PRINT '4. Run cleanup script later to remove account_type (optional)';
PRINT '';
PRINT 'Next steps:';
PRINT '1. Update your application code to use RBAC';
PRINT '2. Test thoroughly before deploying';
PRINT '3. Monitor for any issues';
PRINT '========================================';
