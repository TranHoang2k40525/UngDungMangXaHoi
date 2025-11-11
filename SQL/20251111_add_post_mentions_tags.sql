-- Migration script: add mentioned_user_ids and tagged_user_ids to Posts
-- Generated: 2025-11-11
-- RDBMS: Microsoft SQL Server

SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Add column mentioned_user_ids if not exists
IF COL_LENGTH('dbo.Posts', 'mentioned_user_ids') IS NULL
BEGIN
    ALTER TABLE dbo.Posts
    ADD mentioned_user_ids NVARCHAR(2000) NULL;
END

-- Add column tagged_user_ids if not exists
IF COL_LENGTH('dbo.Posts', 'tagged_user_ids') IS NULL
BEGIN
    ALTER TABLE dbo.Posts
    ADD tagged_user_ids NVARCHAR(2000) NULL;
END

COMMIT TRANSACTION;

-- Rollback (if you need to remove these columns):
-- IF COL_LENGTH('dbo.Posts', 'tagged_user_ids') IS NOT NULL
-- BEGIN
--     ALTER TABLE dbo.Posts DROP COLUMN tagged_user_ids;
-- END
-- IF COL_LENGTH('dbo.Posts', 'mentioned_user_ids') IS NOT NULL
-- BEGIN
--     ALTER TABLE dbo.Posts DROP COLUMN mentioned_user_ids;
-- END
