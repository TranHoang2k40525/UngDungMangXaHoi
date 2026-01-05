-- Check account pending với email cụ thể
SELECT 
    a.account_id,
    a.email,
    a.phone,
    a.status,
    a.created_at,
    u.user_id,
    u.username,
    u.full_name,
    u.gender
FROM Accounts a
LEFT JOIN Users u ON a.account_id = u.account_id
WHERE a.email = 'mvu22k412345@gmail.com'
   OR a.account_id = 1;

-- Check OTP cho account này
SELECT 
    otp_id,
    account_id,
    purpose,
    expires_at,
    used,
    created_at,
    CASE 
        WHEN expires_at < GETUTCDATE() THEN 'EXPIRED'
        WHEN used = 1 THEN 'USED'
        ELSE 'VALID'
    END AS otp_status
FROM OTPs
WHERE account_id = 1
ORDER BY created_at DESC;

-- Check roles của account
SELECT 
    a.account_id,
    a.email,
    r.role_name,
    ar.is_active,
    ar.assigned_at
FROM Accounts a
LEFT JOIN AccountRoles ar ON a.account_id = ar.account_id
LEFT JOIN Roles r ON ar.role_id = r.role_id
WHERE a.account_id = 1;
