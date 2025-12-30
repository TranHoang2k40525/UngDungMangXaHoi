-- ========================================
-- SEED RBAC DATA: Roles, Permissions, and Mappings
-- Purpose: Khởi tạo dữ liệu cho hệ thống RBAC
-- ========================================

BEGIN TRANSACTION;

-- ========================================
-- STEP 1: Insert Roles
-- ========================================
PRINT 'STEP 1: Inserting Roles...';

-- Clear existing data (for clean migration)
DELETE FROM [dbo].[RolePermissions];
DELETE FROM [dbo].[AccountRoles];
DELETE FROM [dbo].[Roles];

-- Insert 3 main roles
SET IDENTITY_INSERT [dbo].[Roles] ON;

INSERT INTO [dbo].[Roles] ([role_id], [role_name], [description], [is_assignable], [priority], [created_at], [updated_at])
VALUES 
    (1, 'Admin', N'Quản trị viên hệ thống với toàn quyền', 1, 100, GETUTCDATE(), GETUTCDATE()),
    (2, 'User', N'Người dùng thông thường', 1, 10, GETUTCDATE(), GETUTCDATE()),
    (3, 'Business', N'Tài khoản kinh doanh (nâng cấp từ User)', 1, 50, GETUTCDATE(), GETUTCDATE());

SET IDENTITY_INSERT [dbo].[Roles] OFF;

PRINT 'Inserted 3 roles: Admin, User, Business';
PRINT '';

-- ========================================
-- STEP 2: Insert Permissions
-- ========================================
PRINT 'STEP 2: Inserting Permissions...';

DELETE FROM [dbo].[Permissions];

-- Posts Module
INSERT INTO [dbo].[Permissions] ([permission_name], [display_name], [module], [description])
VALUES 
    ('posts.create', N'Tạo bài viết', 'Posts', N'Cho phép tạo bài viết mới'),
    ('posts.edit', N'Chỉnh sửa bài viết', 'Posts', N'Cho phép chỉnh sửa bài viết của mình'),
    ('posts.delete', N'Xóa bài viết', 'Posts', N'Cho phép xóa bài viết của mình'),
    ('posts.view', N'Xem bài viết', 'Posts', N'Cho phép xem bài viết công khai'),
    ('posts.moderate', N'Kiểm duyệt bài viết', 'Posts', N'Cho phép kiểm duyệt và xóa bài viết của người khác'),
    ('posts.sponsored', N'Đăng bài tài trợ', 'Posts', N'Cho phép đăng bài quảng cáo (Business)'),
    ('posts.pin', N'Ghim bài viết', 'Posts', N'Cho phép ghim bài viết lên đầu');

-- Comments Module
INSERT INTO [dbo].[Permissions] ([permission_name], [display_name], [module], [description])
VALUES 
    ('comments.create', N'Tạo bình luận', 'Comments', N'Cho phép bình luận bài viết'),
    ('comments.edit', N'Chỉnh sửa bình luận', 'Comments', N'Cho phép chỉnh sửa bình luận của mình'),
    ('comments.delete', N'Xóa bình luận', 'Comments', N'Cho phép xóa bình luận của mình'),
    ('comments.moderate', N'Kiểm duyệt bình luận', 'Comments', N'Cho phép xóa bình luận của người khác'),
    ('comments.react', N'React bình luận', 'Comments', N'Cho phép react bình luận');

-- Stories Module
INSERT INTO [dbo].[Permissions] ([permission_name], [display_name], [module], [description])
VALUES 
    ('stories.create', N'Tạo story', 'Stories', N'Cho phép tạo story mới'),
    ('stories.view', N'Xem story', 'Stories', N'Cho phép xem story của người khác'),
    ('stories.delete', N'Xóa story', 'Stories', N'Cho phép xóa story của mình');

-- Messages Module
INSERT INTO [dbo].[Permissions] ([permission_name], [display_name], [module], [description])
VALUES 
    ('messages.send', N'Gửi tin nhắn', 'Messages', N'Cho phép gửi tin nhắn trực tiếp'),
    ('messages.read', N'Đọc tin nhắn', 'Messages', N'Cho phép đọc tin nhắn'),
    ('messages.delete', N'Xóa tin nhắn', 'Messages', N'Cho phép xóa tin nhắn của mình');

-- Group Chat Module
INSERT INTO [dbo].[Permissions] ([permission_name], [display_name], [module], [description])
VALUES 
    ('groupchat.create', N'Tạo nhóm chat', 'GroupChat', N'Cho phép tạo nhóm chat'),
    ('groupchat.send', N'Gửi tin nhắn nhóm', 'GroupChat', N'Cho phép gửi tin nhắn trong nhóm'),
    ('groupchat.manage', N'Quản lý nhóm', 'GroupChat', N'Cho phép quản lý thành viên và cài đặt nhóm');

-- Search Module
INSERT INTO [dbo].[Permissions] ([permission_name], [display_name], [module], [description])
VALUES 
    ('search.use', N'Tìm kiếm', 'Search', N'Cho phép tìm kiếm người dùng và bài viết'),
    ('search.history', N'Lịch sử tìm kiếm', 'Search', N'Cho phép xem lịch sử tìm kiếm của mình');

-- Profile Module
INSERT INTO [dbo].[Permissions] ([permission_name], [display_name], [module], [description])
VALUES 
    ('profile.view', N'Xem profile', 'Profile', N'Cho phép xem profile người khác'),
    ('profile.edit', N'Chỉnh sửa profile', 'Profile', N'Cho phép chỉnh sửa profile của mình'),
    ('profile.follow', N'Follow người dùng', 'Profile', N'Cho phép follow/unfollow người khác'),
    ('profile.block', N'Chặn người dùng', 'Profile', N'Cho phép chặn người khác');

-- Notifications Module
INSERT INTO [dbo].[Permissions] ([permission_name], [display_name], [module], [description])
VALUES 
    ('notifications.view', N'Xem thông báo', 'Notifications', N'Cho phép xem thông báo của mình'),
    ('notifications.manage', N'Quản lý thông báo', 'Notifications', N'Cho phép quản lý cài đặt thông báo');

-- Business Module
INSERT INTO [dbo].[Permissions] ([permission_name], [display_name], [module], [description])
VALUES 
    ('business.upgrade', N'Nâng cấp Business', 'Business', N'Cho phép yêu cầu nâng cấp tài khoản Business'),
    ('business.analytics', N'Xem thống kê Business', 'Business', N'Cho phép xem analytics bài viết Business'),
    ('business.payment', N'Thanh toán Business', 'Business', N'Cho phép thanh toán gói Business');

-- Admin Module
INSERT INTO [dbo].[Permissions] ([permission_name], [display_name], [module], [description])
VALUES 
    ('admin.dashboard', N'Xem Dashboard Admin', 'Admin', N'Cho phép truy cập dashboard quản trị'),
    ('admin.users.view', N'Xem danh sách users', 'Admin', N'Cho phép xem danh sách người dùng'),
    ('admin.users.edit', N'Chỉnh sửa users', 'Admin', N'Cho phép chỉnh sửa thông tin người dùng'),
    ('admin.users.ban', N'Ban users', 'Admin', N'Cho phép ban/unban người dùng'),
    ('admin.users.delete', N'Xóa users', 'Admin', N'Cho phép xóa tài khoản người dùng'),
    ('admin.content.moderate', N'Kiểm duyệt nội dung', 'Admin', N'Cho phép kiểm duyệt và xóa nội dung vi phạm'),
    ('admin.reports.view', N'Xem báo cáo', 'Admin', N'Cho phép xem báo cáo từ người dùng'),
    ('admin.reports.resolve', N'Xử lý báo cáo', 'Admin', N'Cho phép xử lý báo cáo vi phạm'),
    ('admin.business.verify', N'Duyệt Business', 'Admin', N'Cho phép duyệt yêu cầu nâng cấp Business'),
    ('admin.statistics.view', N'Xem thống kê', 'Admin', N'Cho phép xem thống kê hệ thống'),
    ('admin.roles.manage', N'Quản lý roles', 'Admin', N'Cho phép quản lý roles và permissions');

PRINT 'Inserted all permissions (42 permissions)';
PRINT '';

-- ========================================
-- STEP 3: Map Permissions to Roles
-- ========================================
PRINT 'STEP 3: Mapping permissions to roles...';

-- USER ROLE PERMISSIONS (Basic user permissions)
INSERT INTO [dbo].[RolePermissions] ([role_id], [permission_id], [granted_by])
SELECT 2, [permission_id], 'SYSTEM'
FROM [dbo].[Permissions]
WHERE [permission_name] IN (
    -- Posts
    'posts.create', 'posts.edit', 'posts.delete', 'posts.view',
    -- Comments
    'comments.create', 'comments.edit', 'comments.delete', 'comments.react',
    -- Stories
    'stories.create', 'stories.view', 'stories.delete',
    -- Messages
    'messages.send', 'messages.read', 'messages.delete',
    -- Group Chat
    'groupchat.create', 'groupchat.send', 'groupchat.manage',
    -- Search
    'search.use', 'search.history',
    -- Profile
    'profile.view', 'profile.edit', 'profile.follow', 'profile.block',
    -- Notifications
    'notifications.view', 'notifications.manage',
    -- Business
    'business.upgrade'
);

PRINT 'Mapped permissions for User role';

-- BUSINESS ROLE PERMISSIONS (User permissions + Business features)
INSERT INTO [dbo].[RolePermissions] ([role_id], [permission_id], [granted_by])
SELECT 3, [permission_id], 'SYSTEM'
FROM [dbo].[Permissions]
WHERE [permission_name] IN (
    -- All User permissions
    'posts.create', 'posts.edit', 'posts.delete', 'posts.view',
    'comments.create', 'comments.edit', 'comments.delete', 'comments.react',
    'stories.create', 'stories.view', 'stories.delete',
    'messages.send', 'messages.read', 'messages.delete',
    'groupchat.create', 'groupchat.send', 'groupchat.manage',
    'search.use', 'search.history',
    'profile.view', 'profile.edit', 'profile.follow', 'profile.block',
    'notifications.view', 'notifications.manage',
    -- Plus Business features
    'posts.sponsored', 'posts.pin',
    'business.analytics', 'business.payment'
);

PRINT 'Mapped permissions for Business role';

-- ADMIN ROLE PERMISSIONS (All permissions)
INSERT INTO [dbo].[RolePermissions] ([role_id], [permission_id], [granted_by])
SELECT 1, [permission_id], 'SYSTEM'
FROM [dbo].[Permissions];

PRINT 'Mapped all permissions for Admin role';
PRINT '';

-- ========================================
-- STEP 4: Summary
-- ========================================
PRINT '========================================';
PRINT 'RBAC Data Seeding Summary:';
PRINT '========================================';
SELECT 
    r.role_name AS [Role],
    r.priority AS [Priority],
    COUNT(rp.permission_id) AS [Permissions Count]
FROM [dbo].[Roles] r
LEFT JOIN [dbo].[RolePermissions] rp ON r.role_id = rp.role_id
GROUP BY r.role_name, r.priority
ORDER BY r.priority DESC;

DECLARE @PermCount INT = (SELECT COUNT(*) FROM [dbo].[Permissions]);
PRINT '';
PRINT 'Total Permissions: ' + CAST(@PermCount AS VARCHAR);
PRINT '';

COMMIT TRANSACTION;

PRINT '========================================';
PRINT 'RBAC data seeding completed successfully!';
PRINT 'Next step: Run migrate_account_type_to_rbac.sql to migrate existing data';
PRINT '========================================';
