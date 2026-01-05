-- FIX GENDER CHECK CONSTRAINT
-- Problem: Gender column has strict CHECK constraint that blocks new users

USE ungdungmangxahoiv_2;
GO

-- Step 1: Check current constraint
SELECT 
    OBJECT_NAME(parent_object_id) AS TableName,
    name AS ConstraintName,
    definition
FROM sys.check_constraints
WHERE name LIKE '%gender%';
GO

-- Step 2: Drop old constraint
ALTER TABLE Users
DROP CONSTRAINT CK__Users__gender__412EB0B6;
GO

-- Step 3: Create new constraint that allows NULL or valid values
ALTER TABLE Users
ADD CONSTRAINT CK_Users_Gender 
CHECK (gender IS NULL OR gender IN ('Male', 'Female', 'Other', 'Nam', 'Nữ', 'Khác'));
GO

-- Step 4: Verify
SELECT 
    OBJECT_NAME(parent_object_id) AS TableName,
    name AS ConstraintName,
    definition
FROM sys.check_constraints
WHERE name = 'CK_Users_Gender';
GO

PRINT 'Gender constraint fixed successfully!';
PRINT 'Users can now be created with NULL gender or valid values.';
