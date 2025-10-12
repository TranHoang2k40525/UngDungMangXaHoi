-- Cập nhật kích thước cột refresh_token từ NVARCHAR(255) thành NVARCHAR(1000)
ALTER TABLE RefreshTokens 
ALTER COLUMN refresh_token NVARCHAR(1000) NOT NULL;
