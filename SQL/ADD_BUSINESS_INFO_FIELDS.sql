-- ============================================================================
-- THÊM CÁC TRƯỜNG THÔNG TIN DOANH NGHIỆP
-- Mục đích: Thêm thông tin chi tiết về doanh nghiệp vào BusinessVerificationRequests
-- Database: ungdungmangxahoiv_2
-- Table: BusinessVerificationRequests
-- ============================================================================

USE ungdungmangxahoiv_2;
GO

PRINT '============================================================================';
PRINT 'BƯỚC 1: KIỂM TRA CÁC CỘT HIỆN TẠI';
PRINT '============================================================================';
PRINT '';

-- Xem cấu trúc bảng hiện tại
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'BusinessVerificationRequests'
ORDER BY ORDINAL_POSITION;
GO

PRINT '';
PRINT '============================================================================';
PRINT 'BƯỚC 2: THÊM CÁC CỘT MỚI CHO THÔNG TIN DOANH NGHIỆP';
PRINT '============================================================================';
PRINT '';

-- Thêm business_name (Tên doanh nghiệp)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'BusinessVerificationRequests' AND COLUMN_NAME = 'business_name'
)
BEGIN
    PRINT 'Đang thêm cột business_name...';
    ALTER TABLE BusinessVerificationRequests
    ADD business_name NVARCHAR(200) NULL;
    PRINT '✅ Đã thêm business_name';
END
ELSE
    PRINT '⚠️ Cột business_name đã tồn tại';
GO

-- Thêm owner_name (Tên chủ sở hữu)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'BusinessVerificationRequests' AND COLUMN_NAME = 'owner_name'
)
BEGIN
    PRINT 'Đang thêm cột owner_name...';
    ALTER TABLE BusinessVerificationRequests
    ADD owner_name NVARCHAR(100) NULL;
    PRINT '✅ Đã thêm owner_name';
END
ELSE
    PRINT '⚠️ Cột owner_name đã tồn tại';
GO

-- Thêm tax_code (Mã số thuế)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'BusinessVerificationRequests' AND COLUMN_NAME = 'tax_code'
)
BEGIN
    PRINT 'Đang thêm cột tax_code...';
    ALTER TABLE BusinessVerificationRequests
    ADD tax_code NVARCHAR(50) NULL;
    PRINT '✅ Đã thêm tax_code';
END
ELSE
    PRINT '⚠️ Cột tax_code đã tồn tại';
GO

-- Thêm business_type (Loại hình kinh doanh)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'BusinessVerificationRequests' AND COLUMN_NAME = 'business_type'
)
BEGIN
    PRINT 'Đang thêm cột business_type...';
    ALTER TABLE BusinessVerificationRequests
    ADD business_type NVARCHAR(100) NULL;
    PRINT '✅ Đã thêm business_type';
END
ELSE
    PRINT '⚠️ Cột business_type đã tồn tại';
GO

-- Thêm phone_number (Số điện thoại doanh nghiệp)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'BusinessVerificationRequests' AND COLUMN_NAME = 'phone_number'
)
BEGIN
    PRINT 'Đang thêm cột phone_number...';
    ALTER TABLE BusinessVerificationRequests
    ADD phone_number NVARCHAR(20) NULL;
    PRINT '✅ Đã thêm phone_number';
END
ELSE
    PRINT '⚠️ Cột phone_number đã tồn tại';
GO

-- Thêm address (Địa chỉ)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'BusinessVerificationRequests' AND COLUMN_NAME = 'address'
)
BEGIN
    PRINT 'Đang thêm cột address...';
    ALTER TABLE BusinessVerificationRequests
    ADD address NVARCHAR(500) NULL;
    PRINT '✅ Đã thêm address';
END
ELSE
    PRINT '⚠️ Cột address đã tồn tại';
GO

-- Thêm website
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'BusinessVerificationRequests' AND COLUMN_NAME = 'website'
)
BEGIN
    PRINT 'Đang thêm cột website...';
    ALTER TABLE BusinessVerificationRequests
    ADD website NVARCHAR(200) NULL;
    PRINT '✅ Đã thêm website';
END
ELSE
    PRINT '⚠️ Cột website đã tồn tại';
GO

-- Thêm description (Mô tả doanh nghiệp)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'BusinessVerificationRequests' AND COLUMN_NAME = 'description'
)
BEGIN
    PRINT 'Đang thêm cột description...';
    ALTER TABLE BusinessVerificationRequests
    ADD description NVARCHAR(1000) NULL;
    PRINT '✅ Đã thêm description';
END
ELSE
    PRINT '⚠️ Cột description đã tồn tại';
GO

PRINT '';
PRINT '============================================================================';
PRINT 'BƯỚC 3: KIỂM TRA KẾT QUẢ';
PRINT '============================================================================';
PRINT '';

-- Xem cấu trúc bảng sau khi thêm
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'BusinessVerificationRequests'
ORDER BY ORDINAL_POSITION;
GO

PRINT '';
PRINT '============================================================================';
PRINT 'BƯỚC 4: THÊM DỮ LIỆU MẪU (TÙY CHỌN)';
PRINT '============================================================================';
PRINT '';

-- Chèn một vài yêu cầu mẫu để test
PRINT 'Đang thêm dữ liệu mẫu...';

-- Kiểm tra xem có account_id = 1 không
IF EXISTS (SELECT 1 FROM Accounts WHERE account_id = 1)
BEGIN
    -- Thêm request mẫu 1
    IF NOT EXISTS (SELECT 1 FROM BusinessVerificationRequests WHERE business_name = N'Nhà hàng ABC')
    BEGIN
        INSERT INTO BusinessVerificationRequests (
            account_id,
            business_name,
            owner_name,
            tax_code,
            business_type,
            phone_number,
            address,
            website,
            description,
            submitted_at,
            status,
            documents_url
        )
        VALUES (
            1,
            N'Nhà hàng ABC',
            N'Nguyễn Văn A',
            '0100000001',
            N'Nhà hàng',
            '0987654321',
            N'123 Đường ABC, Quận 1, TP.HCM',
            'https://nhahangabc.com',
            N'Nhà hàng chuyên các món ăn Việt Nam truyền thống',
            GETDATE(),
            'Pending',
            'https://example.com/docs/business1.pdf'
        );
        PRINT '✅ Đã thêm request mẫu: Nhà hàng ABC';
    END
END

-- Thêm request mẫu 2 (nếu có account khác)
IF EXISTS (SELECT 1 FROM Accounts WHERE account_id = 2)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM BusinessVerificationRequests WHERE business_name = N'Cửa hàng XYZ')
    BEGIN
        INSERT INTO BusinessVerificationRequests (
            account_id,
            business_name,
            owner_name,
            tax_code,
            business_type,
            phone_number,
            address,
            website,
            description,
            submitted_at,
            status,
            documents_url
        )
        VALUES (
            2,
            N'Cửa hàng XYZ',
            N'Trần Thị B',
            '0100111111',
            N'Cửa hàng',
            '0976543210',
            N'456 Đường DEF, Quận 3, TP.HCM',
            'https://cuahangxyz.com',
            N'Cửa hàng thời trang cao cấp',
            DATEADD(DAY, -1, GETDATE()),
            'Pending',
            'https://example.com/docs/business2.pdf'
        );
        PRINT '✅ Đã thêm request mẫu: Cửa hàng XYZ';
    END
END

GO

PRINT '';
PRINT '============================================================================';
PRINT 'BƯỚC 5: XEM DỮ LIỆU MẪU';
PRINT '============================================================================';
PRINT '';

SELECT TOP 5
    request_id,
    account_id,
    business_name,
    owner_name,
    tax_code,
    business_type,
    phone_number,
    status,
    submitted_at
FROM BusinessVerificationRequests
ORDER BY submitted_at DESC;
GO

PRINT '';
PRINT '============================================================================';
PRINT '                        HOÀN TẤT!';
PRINT '============================================================================';
PRINT '';
PRINT '✅ Đã thêm thành công các trường thông tin doanh nghiệp!';
PRINT '';
PRINT 'Các trường đã thêm:';
PRINT '  - business_name: Tên doanh nghiệp';
PRINT '  - owner_name: Tên chủ sở hữu';
PRINT '  - tax_code: Mã số thuế';
PRINT '  - business_type: Loại hình kinh doanh';
PRINT '  - phone_number: Số điện thoại';
PRINT '  - address: Địa chỉ';
PRINT '  - website: Website';
PRINT '  - description: Mô tả';
PRINT '';
PRINT 'Bây giờ bạn có thể:';
PRINT '  1. Cập nhật Entity BusinessVerificationRequest trong C#';
PRINT '  2. Cập nhật Controller để sử dụng các trường mới';
PRINT '  3. Test lại Web Admin';
PRINT '';
PRINT '============================================================================';
GO
