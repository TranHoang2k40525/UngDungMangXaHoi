-- Script để đồng bộ các bảng còn thiếu vào database
-- Chạy script này để tạo tất cả các bảng mà Entity Framework đang sử dụng

USE ungdungmangxahoiv_2;
GO

-- Thêm cột mới vào bảng Accounts nếu chưa có
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Accounts' AND COLUMN_NAME = 'business_verified_at')
BEGIN
    ALTER TABLE Accounts ADD business_verified_at DATETIME NULL;
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Accounts' AND COLUMN_NAME = 'business_expires_at')
BEGIN
    ALTER TABLE Accounts ADD business_expires_at DATETIME NULL;
END
GO

-- Thêm cột message_id vào Notifications nếu chưa có
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Notifications' AND COLUMN_NAME = 'message_id')
BEGIN
    ALTER TABLE Notifications ADD message_id INT NULL;
END
GO

-- Tạo bảng AccountSanctions
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AccountSanctions')
BEGIN
    CREATE TABLE AccountSanctions (
        sanction_id INT IDENTITY(1,1) PRIMARY KEY,
        account_id INT NOT NULL,
        admin_id INT NULL,
        action_type NVARCHAR(50) NOT NULL,
        reason NVARCHAR(1000) NOT NULL,
        start_at DATETIME NOT NULL DEFAULT GETDATE(),
        end_at DATETIME NULL,
        is_active BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_AccountSanctions_Accounts FOREIGN KEY (account_id) 
            REFERENCES Accounts(account_id) ON DELETE CASCADE,
        CONSTRAINT FK_AccountSanctions_Admins FOREIGN KEY (admin_id) 
            REFERENCES Admins(admin_id) ON DELETE NO ACTION
    );
    
    CREATE INDEX IX_AccountSanctions_account_id ON AccountSanctions(account_id);
END
GO

-- Tạo bảng AdminActions
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AdminActions')
BEGIN
    CREATE TABLE AdminActions (
        action_id INT IDENTITY(1,1) PRIMARY KEY,
        admin_id INT NULL,
        action NVARCHAR(100) NOT NULL,
        target_type NVARCHAR(50) NULL,
        target_id INT NULL,
        reason NVARCHAR(1000) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_AdminActions_Admins FOREIGN KEY (admin_id) 
            REFERENCES Admins(admin_id) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_AdminActions_admin_id ON AdminActions(admin_id);
END
GO

-- Tạo bảng BusinessVerificationRequests
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BusinessVerificationRequests')
BEGIN
    CREATE TABLE BusinessVerificationRequests (
        request_id INT IDENTITY(1,1) PRIMARY KEY,
        account_id INT NOT NULL,
        submitted_at DATETIME NOT NULL DEFAULT GETDATE(),
        status NVARCHAR(20) NOT NULL,
        documents_url NVARCHAR(2000) NULL,
        assigned_admin_id INT NULL,
        reviewed_at DATETIME NULL,
        reviewed_notes NVARCHAR(1000) NULL,
        expires_at DATETIME NULL,
        CONSTRAINT FK_BusinessVerificationRequests_Accounts FOREIGN KEY (account_id) 
            REFERENCES Accounts(account_id) ON DELETE CASCADE,
        CONSTRAINT FK_BusinessVerificationRequests_Admins FOREIGN KEY (assigned_admin_id) 
            REFERENCES Admins(admin_id) ON DELETE NO ACTION
    );
    
    CREATE INDEX IX_BusinessVerificationRequests_account_id ON BusinessVerificationRequests(account_id);
    CREATE INDEX IX_BusinessVerificationRequests_assigned_admin_id ON BusinessVerificationRequests(assigned_admin_id);
END
GO

-- Tạo bảng BusinessPayments
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BusinessPayments')
BEGIN
    CREATE TABLE BusinessPayments (
        payment_id INT IDENTITY(1,1) PRIMARY KEY,
        account_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method NVARCHAR(50) NOT NULL,
        transaction_id NVARCHAR(255) NULL,
        status NVARCHAR(20) NOT NULL,
        payment_date DATETIME NOT NULL DEFAULT GETDATE(),
        verified_at DATETIME NULL,
        expires_at DATETIME NULL,
        CONSTRAINT FK_BusinessPayments_Accounts FOREIGN KEY (account_id) 
            REFERENCES Accounts(account_id) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_BusinessPayments_account_id ON BusinessPayments(account_id);
    CREATE INDEX IX_BusinessPayments_transaction_id ON BusinessPayments(transaction_id);
END
GO

-- Tạo bảng ContentReports
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ContentReports')
BEGIN
    CREATE TABLE ContentReports (
        report_id INT IDENTITY(1,1) PRIMARY KEY,
        reporter_id INT NOT NULL,
        content_type NVARCHAR(50) NOT NULL,
        content_id INT NOT NULL,
        reason NVARCHAR(100) NOT NULL,
        description NVARCHAR(1000) NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        reviewed_at DATETIME NULL,
        reviewed_by INT NULL,
        action_taken NVARCHAR(50) NULL,
        CONSTRAINT FK_ContentReports_Users FOREIGN KEY (reporter_id) 
            REFERENCES Users(user_id) ON DELETE NO ACTION,
        CONSTRAINT FK_ContentReports_Admins FOREIGN KEY (reviewed_by) 
            REFERENCES Admins(admin_id) ON DELETE NO ACTION
    );
    
    CREATE INDEX IX_ContentReports_reporter_id ON ContentReports(reporter_id);
    CREATE INDEX IX_ContentReports_reviewed_by ON ContentReports(reviewed_by);
    CREATE INDEX IX_ContentReports_content_type_content_id ON ContentReports(content_type, content_id);
END
GO

PRINT 'Đã đồng bộ thành công tất cả các bảng còn thiếu vào database!';
GO
