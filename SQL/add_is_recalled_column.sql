-- Thêm cột is_recalled vào bảng MessagesNew
USE ungdungmangxahoiv_2;
GO

-- Kiểm tra xem cột đã tồn tại chưa
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'MessagesNew' 
    AND COLUMN_NAME = 'is_recalled'
)
BEGIN
    ALTER TABLE MessagesNew 
    ADD is_recalled BIT NOT NULL DEFAULT 0;
    
    PRINT 'Đã thêm cột is_recalled thành công!';
END
ELSE
BEGIN
    PRINT 'Cột is_recalled đã tồn tại!';
END
GO
