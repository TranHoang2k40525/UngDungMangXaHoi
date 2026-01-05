-- ================================================
-- CREATE TEST POST WITH MULTIPLE MEDIA
-- Test Media Gallery & Lightbox Features
-- ================================================

USE UngDungMangXaHoi;
GO

-- 🎯 Test Case 1: Post với 8 ảnh
DECLARE @TestPost1 INT;

INSERT INTO Posts (user_id, caption, privacy, location, is_visible, created_at, updated_at)
VALUES (
    1,  -- User ID của @quan
    N'Chuyến du lịch Đà Lạt 2024 🌸🏔️
    
Những khoảnh khắc tuyệt vời tại thành phố ngàn hoa! 
8 bức ảnh tuyệt đẹp từ chuyến đi này 😍

#DaLat #Travel #Vietnam #Photography',
    'public',
    N'Đà Lạt, Lâm Đồng',
    1,
    GETDATE(),
    GETDATE()
);

SET @TestPost1 = SCOPE_IDENTITY();

-- Insert 8 ảnh
INSERT INTO Media (post_id, type, url, order_index, created_at)
VALUES 
    (@TestPost1, 'Image', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 1, GETDATE()),
    (@TestPost1, 'Image', 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800', 2, GETDATE()),
    (@TestPost1, 'Image', 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800', 3, GETDATE()),
    (@TestPost1, 'Image', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800', 4, GETDATE()),
    (@TestPost1, 'Image', 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800', 5, GETDATE()),
    (@TestPost1, 'Image', 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800', 6, GETDATE()),
    (@TestPost1, 'Image', 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800', 7, GETDATE()),
    (@TestPost1, 'Image', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', 8, GETDATE());

PRINT N'✅ Created Post #' + CAST(@TestPost1 AS NVARCHAR) + N' với 8 ảnh';

-- 🎯 Test Case 2: Post với 3 ảnh + 2 video
DECLARE @TestPost2 INT;

INSERT INTO Posts (user_id, caption, privacy, location, is_visible, created_at, updated_at)
VALUES (
    1,
    N'Workshop Photography & Videography 📸🎥
    
Hôm nay mình có buổi workshop về nhiếp ảnh và quay phim!
Chia sẻ một số khoảnh khắc và clip hay 🎬

#Workshop #Photography #Videography #Learning',
    'public',
    N'TP. Hồ Chí Minh',
    1,
    GETDATE(),
    GETDATE()
);

SET @TestPost2 = SCOPE_IDENTITY();

-- Insert 3 ảnh + 2 video
INSERT INTO Media (post_id, type, url, order_index, created_at)
VALUES 
    (@TestPost2, 'Image', 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800', 1, GETDATE()),
    (@TestPost2, 'Video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 2, GETDATE()),
    (@TestPost2, 'Image', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800', 3, GETDATE()),
    (@TestPost2, 'Video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 4, GETDATE()),
    (@TestPost2, 'Image', 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800', 5, GETDATE());

PRINT N'✅ Created Post #' + CAST(@TestPost2 AS NVARCHAR) + N' với 3 ảnh + 2 video';

-- 🎯 Test Case 3: Post với 12 ảnh (test scroll)
DECLARE @TestPost3 INT;

INSERT INTO Posts (user_id, caption, privacy, location, is_visible, created_at, updated_at)
VALUES (
    1,
    N'Nature Collection 2024 🌿🌺🌸
    
Album 12 bức ảnh thiên nhiên tuyệt đẹp mình chụp được!
Từ núi non đến biển cả, từ rừng già đến đồng cỏ...

Test lightbox navigation với nhiều ảnh! 📸

#Nature #Photography #Collection #Landscape',
    'public',
    N'Vietnam',
    1,
    GETDATE(),
    GETDATE()
);

SET @TestPost3 = SCOPE_IDENTITY();

-- Insert 12 ảnh
INSERT INTO Media (post_id, type, url, order_index, created_at)
VALUES 
    (@TestPost3, 'Image', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 1, GETDATE()),
    (@TestPost3, 'Image', 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800', 2, GETDATE()),
    (@TestPost3, 'Image', 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800', 3, GETDATE()),
    (@TestPost3, 'Image', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800', 4, GETDATE()),
    (@TestPost3, 'Image', 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800', 5, GETDATE()),
    (@TestPost3, 'Image', 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800', 6, GETDATE()),
    (@TestPost3, 'Image', 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800', 7, GETDATE()),
    (@TestPost3, 'Image', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', 8, GETDATE()),
    (@TestPost3, 'Image', 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800', 9, GETDATE()),
    (@TestPost3, 'Image', 'https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=800', 10, GETDATE()),
    (@TestPost3, 'Image', 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=800', 11, GETDATE()),
    (@TestPost3, 'Image', 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800', 12, GETDATE());

PRINT N'✅ Created Post #' + CAST(@TestPost3 AS NVARCHAR) + N' với 12 ảnh';

-- 🎯 Test Case 4: Post chỉ có 1 ảnh (test single image lightbox)
DECLARE @TestPost4 INT;

INSERT INTO Posts (user_id, caption, privacy, location, is_visible, created_at, updated_at)
VALUES (
    1,
    N'Sunset at the Beach 🌅
    
Một bức ảnh hoàng hôn tuyệt đẹp! 
Perfect moment captured 📸

#Sunset #Beach #Photography',
    'public',
    N'Vũng Tàu',
    1,
    GETDATE(),
    GETDATE()
);

SET @TestPost4 = SCOPE_IDENTITY();

INSERT INTO Media (post_id, type, url, order_index, created_at)
VALUES (@TestPost4, 'Image', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', 1, GETDATE());

PRINT N'✅ Created Post #' + CAST(@TestPost4 AS NVARCHAR) + N' với 1 ảnh';

-- 🎯 Test Case 5: Post chỉ có video
DECLARE @TestPost5 INT;

INSERT INTO Posts (user_id, caption, privacy, location, is_visible, created_at, updated_at)
VALUES (
    1,
    N'Dance Performance 💃🎭
    
Video clip từ buổi biểu diễn hôm qua!
Hope you enjoy! 🎥

#Dance #Performance #Video',
    'public',
    N'Hà Nội',
    1,
    GETDATE(),
    GETDATE()
);

SET @TestPost5 = SCOPE_IDENTITY();

INSERT INTO Media (post_id, type, url, order_index, created_at)
VALUES (@TestPost5, 'Video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 1, GETDATE());

PRINT N'✅ Created Post #' + CAST(@TestPost5 AS NVARCHAR) + N' với 1 video';

-- ================================================
-- CREATE ADMIN ACTIVITY LOGS FOR THESE POSTS
-- ================================================

-- Log cho Post #1 (8 ảnh)
INSERT INTO AdminActivityLogs (
    AdminAccountId, AdminName, AdminEmail, Action, EntityType,
    EntityId, EntityName, Details, IpAddress, Status, Timestamp
)
VALUES (
    5,
    N'Admin',
    'quan2004toanlyhoa@gmail.com',
    N'Kiểm duyệt bài viết',
    N'post',
    @TestPost1,
    N'Chuyến du lịch Đà Lạt 2024',
    N'Bài viết có 8 ảnh - Test media gallery',
    '192.168.1.100',
    'success',
    DATEADD(MINUTE, -30, GETDATE())
);

-- Log cho Post #2 (3 ảnh + 2 video)
INSERT INTO AdminActivityLogs (
    AdminAccountId, AdminName, AdminEmail, Action, EntityType,
    EntityId, EntityName, Details, IpAddress, Status, Timestamp
)
VALUES (
    5,
    N'Admin',
    'quan2004toanlyhoa@gmail.com',
    N'Phê duyệt bài viết',
    N'post',
    @TestPost2,
    N'Workshop Photography',
    N'Bài viết có 3 ảnh + 2 video - Test mixed media',
    '192.168.1.100',
    'success',
    DATEADD(MINUTE, -25, GETDATE())
);

-- Log cho Post #3 (12 ảnh)
INSERT INTO AdminActivityLogs (
    AdminAccountId, AdminName, AdminEmail, Action, EntityType,
    EntityId, EntityName, Details, IpAddress, Status, Timestamp
)
VALUES (
    5,
    N'Admin',
    'quan2004toanlyhoa@gmail.com',
    N'Kiểm tra bài viết',
    N'post',
    @TestPost3,
    N'Nature Collection 2024',
    N'Bài viết có 12 ảnh - Test lightbox navigation',
    '192.168.1.100',
    'success',
    DATEADD(MINUTE, -20, GETDATE())
);

-- Log cho Post #4 (1 ảnh)
INSERT INTO AdminActivityLogs (
    AdminAccountId, AdminName, AdminEmail, Action, EntityType,
    EntityId, EntityName, Details, IpAddress, Status, Timestamp
)
VALUES (
    5,
    N'Admin',
    'quan2004toanlyhoa@gmail.com',
    N'Xem bài viết',
    N'post',
    @TestPost4,
    N'Sunset at the Beach',
    N'Bài viết có 1 ảnh - Test single image',
    '192.168.1.100',
    'success',
    DATEADD(MINUTE, -15, GETDATE())
);

-- Log cho Post #5 (1 video)
INSERT INTO AdminActivityLogs (
    AdminAccountId, AdminName, AdminEmail, Action, EntityType,
    EntityId, EntityName, Details, IpAddress, Status, Timestamp
)
VALUES (
    5,
    N'Admin',
    'quan2004toanlyhoa@gmail.com',
    N'Xem video',
    N'post',
    @TestPost5,
    N'Dance Performance',
    N'Bài viết có 1 video - Test video player',
    '192.168.1.100',
    'success',
    DATEADD(MINUTE, -10, GETDATE())
);

-- ================================================
-- VERIFY CREATED DATA
-- ================================================

PRINT N'';
PRINT N'========================================';
PRINT N'📊 TEST DATA SUMMARY';
PRINT N'========================================';

SELECT 
    p.post_id,
    LEFT(p.caption, 50) + '...' AS Caption,
    COUNT(m.media_id) AS MediaCount,
    STRING_AGG(m.type, ', ') WITHIN GROUP (ORDER BY m.order_index) AS MediaTypes
FROM Posts p
LEFT JOIN Media m ON p.post_id = m.post_id
WHERE p.post_id IN (@TestPost1, @TestPost2, @TestPost3, @TestPost4, @TestPost5)
GROUP BY p.post_id, p.caption
ORDER BY p.post_id;

PRINT N'';
PRINT N'========================================';
PRINT N'🧪 HOW TO TEST';
PRINT N'========================================';
PRINT N'1. Mở Admin Activity Logs page';
PRINT N'2. Tìm 5 logs mới nhất (vừa tạo)';
PRINT N'3. Click vào từng log để mở modal';
PRINT N'4. Test các tính năng:';
PRINT N'   - Post #1: 8 ảnh → Test gallery layout';
PRINT N'   - Post #2: 3 ảnh + 2 video → Test mixed media';
PRINT N'   - Post #3: 12 ảnh → Test lightbox navigation';
PRINT N'   - Post #4: 1 ảnh → Test single image';
PRINT N'   - Post #5: 1 video → Test video player';
PRINT N'';
PRINT N'✅ Script completed successfully!';
GO
