-- FIX GENDER CONSTRAINT
-- Database ungdungmangxahoiv_4 đang có constraint cũ expect integer
-- Cần drop và tạo lại cho string values

USE ungdungmangxahoiv_4;
GO

-- 1. Drop constraint cũ
ALTER TABLE Users DROP CONSTRAINT CK__Users__gender__412EB0B6;
GO

-- 2. Tạo constraint mới cho string values
ALTER TABLE Users
ADD CONSTRAINT CK_Users_gender
CHECK (gender IN ('Nam', N'Nữ', N'Khác'));
GO

-- 3. Verify constraint
SELECT 
    OBJECT_NAME(object_id) AS constraint_name,
    definition,
    type_desc
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('Users')
  AND name LIKE '%gender%';
GO

PRINT 'Gender constraint updated successfully!';
