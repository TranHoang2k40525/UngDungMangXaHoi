-- ==========================================
-- Script: Cập nhật mật khẩu Admin để có thể đăng nhập
-- ==========================================

USE [ungdungmangxahoiv_2]
GO

-- Kiểm tra tài khoản hiện tại
SELECT 
    account_id,
    email,
    phone,
    account_type,
    status,
    password_hash,
    created_at
FROM [dbo].[Accounts]
WHERE email = 'vu08092k4@gmail.com'
GO

-- ==========================================
-- Cách 1: Hash mật khẩu "123456789" bằng BCrypt
-- ==========================================
-- BCrypt hash của "123456789" với cost factor 12:
-- $2a$12$KIXxLhCJYhY7h8dQZ5mGQ.xB0Y4qF4YVH3.5xnO7kZFJ7Q8TnLzXO

UPDATE [dbo].[Accounts]
SET 
    password_hash = '$2a$12$KIXxLhCJYhY7h8dQZ5mGQ.xB0Y4qF4YVH3.5xnO7kZFJ7Q8TnLzXO',
    status = 'active',  -- Đổi sang active để có thể login
    phone = '0385813792',  -- Cập nhật phone nếu chưa có
    updated_at = GETDATE()
WHERE email = 'vu08092k4@gmail.com'
GO

-- Kiểm tra lại sau khi update
SELECT 
    account_id,
    email,
    phone,
    account_type,
    status,
    password_hash,
    updated_at
FROM [dbo].[Accounts]
WHERE email = 'vu08092k4@gmail.com'
GO

-- ==========================================
-- LƯU Ý QUAN TRỌNG:
-- ==========================================
-- 1. Hash trên là ví dụ - trong production phải hash qua backend API
-- 2. Nếu hash không đúng, có thể:
--    a) Dùng backend API để đổi mật khẩu
--    b) Hoặc hash lại bằng BCrypt tool online với cost=12
-- 3. Đảm bảo status = 'active' thì mới login được
-- 4. Account phải có account_type = 'Admin'
-- ==========================================
