-- Xóa các pending admin accounts cũ (nếu có)
DELETE FROM Admins WHERE account_id IN (
    SELECT account_id FROM Accounts WHERE email IN ('vu08092k4@gmail.com', 'nguyenbaminhvucma@gamil.com')
);
DELETE FROM Accounts WHERE email IN ('vu08092k4@gmail.com', 'nguyenbaminhvucma@gamil.com');

-- Tạo 2 pending admin accounts mới trong bảng Accounts
-- Những email này sẽ được phép đăng ký admin
-- Dùng phone tạm vì UNIQUE constraint không cho phép nhiều NULL
-- password_hash = NULL (không phải '') để tránh lỗi PasswordHash value object validation
INSERT INTO Accounts (email, phone, password_hash, account_type, status, created_at)
VALUES 
    ('vu08092k4@gmail.com', 'PENDING_001', NULL, 'Admin', 'pending', GETDATE()),
    ('nguyenbaminhvucma@gamil.com', 'PENDING_002', NULL, 'Admin', 'pending', GETDATE());

-- Verify
SELECT account_id, email, phone, account_type, status, created_at 
FROM Accounts 
WHERE email IN ('vu08092k4@gmail.com', 'nguyenbaminhvucma@gamil.com');
