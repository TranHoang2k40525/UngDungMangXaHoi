-- Check constraint hiện tại trên column gender
SELECT 
    OBJECT_NAME(object_id) AS constraint_name,
    definition,
    type_desc
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('Users')
  AND OBJECT_NAME(object_id) LIKE '%gender%';

-- Xem định nghĩa đầy đủ của bảng Users
EXEC sp_help 'Users';

-- Hoặc xem script tạo bảng
SELECT 
    c.name AS column_name,
    t.name AS data_type,
    c.max_length,
    c.is_nullable,
    cc.definition AS check_constraint
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
LEFT JOIN sys.check_constraints cc ON cc.parent_object_id = c.object_id 
    AND cc.parent_column_id = c.column_id
WHERE c.object_id = OBJECT_ID('Users')
  AND c.name = 'gender';
