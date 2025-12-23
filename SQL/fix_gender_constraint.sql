-- Fix gender CHECK constraint to properly handle Vietnamese characters
-- This script drops the old constraint and creates a new one with proper encoding

-- Drop existing constraint
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK__Users__gender__412EB0B6')
BEGIN
    ALTER TABLE [dbo].[Users] DROP CONSTRAINT [CK__Users__gender__412EB0B6];
    PRINT 'Dropped old gender constraint on Users table';
END

-- Add new constraint with proper Vietnamese characters
ALTER TABLE [dbo].[Users] 
    ADD CONSTRAINT [CK__Users__gender__412EB0B6] 
    CHECK ([gender] IN (N'Nam', N'Nữ', N'Khác'));
GO

PRINT 'Added new gender constraint on Users table with proper encoding';

-- Do the same for Admins table if needed
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK__Admins__gender__45F365D3')
BEGIN
    ALTER TABLE [dbo].[Admins] DROP CONSTRAINT [CK__Admins__gender__45F365D3];
    PRINT 'Dropped old gender constraint on Admins table';
END

ALTER TABLE [dbo].[Admins] 
    ADD CONSTRAINT [CK__Admins__gender__45F365D3] 
    CHECK ([gender] IN (N'Nam', N'Nữ', N'Khác'));
GO

PRINT 'Added new gender constraint on Admins table with proper encoding';
PRINT 'Gender constraint fix completed successfully!';
