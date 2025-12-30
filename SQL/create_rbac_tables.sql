-- ========================================
-- MIGRATION SCRIPT: Account Type to RBAC
-- Purpose: Chuyển đổi từ account_type sang hệ thống Role-Based Access Control
-- Author: System Migration
-- Date: 2025-01-01
-- ========================================

BEGIN TRANSACTION;

-- ========================================
-- STEP 1: Create RBAC Tables
-- ========================================

-- Table: Roles
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
BEGIN
    CREATE TABLE [dbo].[Roles] (
        [role_id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [role_name] NVARCHAR(50) NOT NULL,
        [description] NVARCHAR(500) NULL,
        [is_assignable] BIT NOT NULL DEFAULT 1,
        [priority] INT NOT NULL DEFAULT 0,
        [created_at] DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        [updated_at] DATETIME2(7) NOT NULL DEFAULT GETUTCDATE()
    );
    
    CREATE UNIQUE INDEX [IX_Roles_RoleName] ON [dbo].[Roles]([role_name]);
    CREATE INDEX [IX_Roles_Priority] ON [dbo].[Roles]([priority]);
    
    PRINT 'Created table: Roles';
END
ELSE
BEGIN
    PRINT 'Table Roles already exists';
END

-- Table: Permissions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Permissions')
BEGIN
    CREATE TABLE [dbo].[Permissions] (
        [permission_id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [permission_name] NVARCHAR(100) NOT NULL,
        [display_name] NVARCHAR(200) NOT NULL,
        [module] NVARCHAR(50) NOT NULL,
        [description] NVARCHAR(500) NULL,
        [created_at] DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        [updated_at] DATETIME2(7) NOT NULL DEFAULT GETUTCDATE()
    );
    
    CREATE UNIQUE INDEX [IX_Permissions_PermissionName] ON [dbo].[Permissions]([permission_name]);
    CREATE INDEX [IX_Permissions_Module] ON [dbo].[Permissions]([module]);
    
    PRINT 'Created table: Permissions';
END
ELSE
BEGIN
    PRINT 'Table Permissions already exists';
END

-- Table: AccountRoles
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AccountRoles')
BEGIN
    CREATE TABLE [dbo].[AccountRoles] (
        [account_role_id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [account_id] INT NOT NULL,
        [role_id] INT NOT NULL,
        [assigned_at] DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        [expires_at] DATETIME2(7) NULL,
        [is_active] BIT NOT NULL DEFAULT 1,
        [assigned_by] NVARCHAR(100) NULL,
        CONSTRAINT [FK_AccountRoles_Accounts] FOREIGN KEY ([account_id]) 
            REFERENCES [dbo].[Accounts]([account_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AccountRoles_Roles] FOREIGN KEY ([role_id]) 
            REFERENCES [dbo].[Roles]([role_id]) ON DELETE NO ACTION
    );
    
    CREATE INDEX [IX_AccountRoles_AccountId_RoleId] ON [dbo].[AccountRoles]([account_id], [role_id]);
    CREATE INDEX [IX_AccountRoles_AccountId] ON [dbo].[AccountRoles]([account_id]);
    CREATE INDEX [IX_AccountRoles_RoleId] ON [dbo].[AccountRoles]([role_id]);
    CREATE INDEX [IX_AccountRoles_ExpiresAt] ON [dbo].[AccountRoles]([expires_at]);
    
    PRINT 'Created table: AccountRoles';
END
ELSE
BEGIN
    PRINT 'Table AccountRoles already exists';
END

-- Table: RolePermissions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RolePermissions')
BEGIN
    CREATE TABLE [dbo].[RolePermissions] (
        [role_permission_id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [role_id] INT NOT NULL,
        [permission_id] INT NOT NULL,
        [granted_at] DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        [granted_by] NVARCHAR(100) NULL,
        CONSTRAINT [FK_RolePermissions_Roles] FOREIGN KEY ([role_id]) 
            REFERENCES [dbo].[Roles]([role_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RolePermissions_Permissions] FOREIGN KEY ([permission_id]) 
            REFERENCES [dbo].[Permissions]([permission_id]) ON DELETE CASCADE
    );
    
    CREATE UNIQUE INDEX [IX_RolePermissions_RoleId_PermissionId] 
        ON [dbo].[RolePermissions]([role_id], [permission_id]);
    CREATE INDEX [IX_RolePermissions_RoleId] ON [dbo].[RolePermissions]([role_id]);
    CREATE INDEX [IX_RolePermissions_PermissionId] ON [dbo].[RolePermissions]([permission_id]);
    
    PRINT 'Created table: RolePermissions';
END
ELSE
BEGIN
    PRINT 'Table RolePermissions already exists';
END

-- Table: AccountPermissions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AccountPermissions')
BEGIN
    CREATE TABLE [dbo].[AccountPermissions] (
        [account_permission_id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [account_id] INT NOT NULL,
        [permission_id] INT NOT NULL,
        [is_granted] BIT NOT NULL DEFAULT 1,
        [assigned_at] DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        [expires_at] DATETIME2(7) NULL,
        [assigned_by] NVARCHAR(100) NULL,
        [reason] NVARCHAR(500) NULL,
        CONSTRAINT [FK_AccountPermissions_Accounts] FOREIGN KEY ([account_id]) 
            REFERENCES [dbo].[Accounts]([account_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AccountPermissions_Permissions] FOREIGN KEY ([permission_id]) 
            REFERENCES [dbo].[Permissions]([permission_id]) ON DELETE NO ACTION
    );
    
    CREATE INDEX [IX_AccountPermissions_AccountId_PermissionId] 
        ON [dbo].[AccountPermissions]([account_id], [permission_id]);
    CREATE INDEX [IX_AccountPermissions_AccountId] ON [dbo].[AccountPermissions]([account_id]);
    CREATE INDEX [IX_AccountPermissions_PermissionId] ON [dbo].[AccountPermissions]([permission_id]);
    CREATE INDEX [IX_AccountPermissions_ExpiresAt] ON [dbo].[AccountPermissions]([expires_at]);
    
    PRINT 'Created table: AccountPermissions';
END
ELSE
BEGIN
    PRINT 'Table AccountPermissions already exists';
END

PRINT 'STEP 1 Completed: Created RBAC tables';
PRINT '';

COMMIT TRANSACTION;

PRINT '========================================';
PRINT 'Migration script completed successfully!';
PRINT 'Next step: Run seed_rbac_data.sql to populate roles and permissions';
PRINT '========================================';
