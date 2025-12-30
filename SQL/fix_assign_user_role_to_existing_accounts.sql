-- Assign default "User" role cho tất cả accounts active nhưng chưa có role
USE ungdungmangxahoiv_4;
GO

DECLARE @UserRoleId INT;
SELECT @UserRoleId = role_id FROM Roles WHERE role_name = 'User';

-- Insert User role cho các account active nhưng chưa có role nào
INSERT INTO AccountRoles (account_id, role_id, is_active, assigned_at, assigned_by)
SELECT 
    a.account_id,
    @UserRoleId,
    1, -- is_active
    GETUTCDATE(),
    NULL -- assigned_by
FROM Accounts a
WHERE a.status = 'active'
  AND NOT EXISTS (
      SELECT 1 FROM AccountRoles ar WHERE ar.account_id = a.account_id
  );

-- Verify
SELECT 
    a.account_id,
    a.email,
    a.status,
    r.role_name,
    ar.is_active
FROM Accounts a
LEFT JOIN AccountRoles ar ON a.account_id = ar.account_id
LEFT JOIN Roles r ON ar.role_id = r.role_id
WHERE a.status = 'active'
ORDER BY a.account_id;

PRINT 'Assigned User role to all active accounts without roles';
