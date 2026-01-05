-- ================================================
-- CREATE POST WITH PUBLIC VIDEO URLs
-- Sử dụng video URLs công khai để test
-- Không cần upload files
-- ================================================

USE UngDungMangXaHoi;
GO

PRINT N'🎬 Creating test posts with PUBLIC video URLs...';
PRINT N'';

-- 🎯 Test Case 1: Bài viết chỉ có 1 video (Big Buck Bunny)
DECLARE @VideoPost1 INT;

INSERT INTO Posts (user_id, caption, privacy, location, is_visible, created_at, updated_at)
VALUES (
    1,  -- User @quan
    N'Big Buck Bunny - Test Video 🐰🎬
    
Đây là video test để kiểm tra tính năng phát video trong modal!
Video courtesy of Blender Foundation.

#TestVideo #BigBuckBunny',
    'public',
    N'Test Lab',
    1,
    GETDATE(),
    GETDATE()
);

SET @VideoPost1 = SCOPE_IDENTITY();

-- Insert video (634 seconds, ~10 phút)
INSERT INTO Media (post_id, type, url, order_index, duration, created_at)
VALUES (@VideoPost1, 'Video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 1, 634, GETDATE());

PRINT N'✅ Created Video Post #' + CAST(@VideoPost1 AS NVARCHAR);

-- 🎯 Test Case 2: Bài viết với 2 video
DECLARE @VideoPost2 INT;

INSERT INTO Posts (user_id, caption, privacy, location, is_visible, created_at, updated_at)
VALUES (
    1,
    N'Sample Videos Collection 🎥📽️
    
2 video samples để test player và lightbox!

#Videos #Testing',
    'public',
    N'Test Lab',
    1,
    GETDATE(),
    GETDATE()
);

SET @VideoPost2 = SCOPE_IDENTITY();

INSERT INTO Media (post_id, type, url, order_index, duration, created_at)
VALUES 
(@VideoPost2, 'Video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 1, 653, GETDATE()),
(@VideoPost2, 'Video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 2, 15, GETDATE());

PRINT N'✅ Created Video Post #' + CAST(@VideoPost2 AS NVARCHAR) + N' (2 videos)';

-- 🎯 Test Case 3: Mixed - 2 ảnh + 1 video
DECLARE @MixedPost INT;

INSERT INTO Posts (user_id, caption, privacy, location, is_visible, created_at, updated_at)
VALUES (
    1,
    N'Mixed Media Test 🖼️🎬
    
Bài viết có cả ảnh và video!
Test gallery layout và video player.

#MixedMedia #PhotoVideo',
    'public',
    N'Studio',
    1,
    GETDATE(),
    GETDATE()
);

SET @MixedPost = SCOPE_IDENTITY();

INSERT INTO Media (post_id, type, url, order_index, created_at)
VALUES 
(@MixedPost, 'Image', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 1, GETDATE()),
(@MixedPost, 'Video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 2, GETDATE()),
(@MixedPost, 'Image', 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800', 3, GETDATE());

PRINT N'✅ Created Mixed Post #' + CAST(@MixedPost AS NVARCHAR) + N' (2 images + 1 video)';

-- ================================================
-- CREATE ADMIN LOGS FOR THESE POSTS
-- ================================================

PRINT N'';
PRINT N'📝 Creating admin activity logs...';

INSERT INTO AdminActivityLogs (
    AdminAccountId, AdminName, AdminEmail, Action, EntityType,
    EntityId, EntityName, Details, IpAddress, Status, Timestamp
)
VALUES 
-- Log for Video Post 1
(5, N'Admin', 'quan2004toanlyhoa@gmail.com',
 N'Kiểm tra video', N'post', @VideoPost1,
 N'Big Buck Bunny Test', N'Bài viết có 1 video - Test video player',
 '192.168.1.100', 'success', DATEADD(MINUTE, -5, GETDATE())),

-- Log for Video Post 2
(5, N'Admin', 'quan2004toanlyhoa@gmail.com',
 N'Duyệt video', N'post', @VideoPost2,
 N'Sample Videos', N'Bài viết có 2 video - Test multiple videos',
 '192.168.1.100', 'success', DATEADD(MINUTE, -3, GETDATE())),

-- Log for Mixed Post
(5, N'Admin', 'quan2004toanlyhoa@gmail.com',
 N'Xem bài viết', N'post', @MixedPost,
 N'Mixed Media Test', N'Bài viết có ảnh và video - Test mixed media',
 '192.168.1.100', 'success', DATEADD(MINUTE, -1, GETDATE()));

PRINT N'✅ Created 3 admin logs';

-- ================================================
-- VERIFY CREATED DATA
-- ================================================

PRINT N'';
PRINT N'========================================';
PRINT N'📊 TEST DATA SUMMARY';
PRINT N'========================================';

SELECT 
    p.post_id,
    LEFT(p.caption, 40) + '...' AS Caption,
    COUNT(m.media_id) AS MediaCount,
    STRING_AGG(m.type, ', ') WITHIN GROUP (ORDER BY m.order_index) AS MediaTypes,
    (SELECT COUNT(*) FROM Media WHERE post_id = p.post_id AND type = 'Video') AS VideoCount
FROM Posts p
LEFT JOIN Media m ON p.post_id = m.post_id
WHERE p.post_id IN (@VideoPost1, @VideoPost2, @MixedPost)
GROUP BY p.post_id, p.caption
ORDER BY p.post_id DESC;

PRINT N'';
PRINT N'========================================';
PRINT N'🎬 VIDEO URLs';
PRINT N'========================================';

SELECT 
    m.media_id,
    m.post_id,
    m.type,
    LEFT(m.url, 70) + '...' AS video_url,
    m.duration
FROM Media m
WHERE m.post_id IN (@VideoPost1, @VideoPost2, @MixedPost)
  AND m.type = 'Video'
ORDER BY m.post_id, m.order_index;

PRINT N'';
PRINT N'========================================';
PRINT N'🧪 HOW TO TEST';
PRINT N'========================================';
PRINT N'1. Restart backend (if not done): .\RESTART_WITH_VIDEO_FIX.ps1';
PRINT N'2. Open: http://localhost:3001/admin-logs';
PRINT N'3. Find the 3 new logs (just created)';
PRINT N'4. Click each log to test:';
PRINT N'   - Post with 1 video → Should play';
PRINT N'   - Post with 2 videos → Both should work';
PRINT N'   - Mixed post → Images in lightbox, video inline';
PRINT N'';
PRINT N'✅ All video URLs are PUBLIC - no file upload needed!';
PRINT N'✅ Videos will load from Google Cloud Storage';
PRINT N'';

GO
