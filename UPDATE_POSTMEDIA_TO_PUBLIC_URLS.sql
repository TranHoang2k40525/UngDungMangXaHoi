-- ================================================
-- UPDATE PostMedia TO PUBLIC URLs
-- Cập nhật URLs thành public URLs để video/image chạy được
-- ================================================

USE ungdungmangxahoiv_2;
GO

PRINT N'';
PRINT N'========================================';
PRINT N'CẬP NHẬT PostMedia URLs';
PRINT N'========================================';
PRINT N'';

-- Backup trước khi update
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PostMedia_Backup')
BEGIN
    SELECT * INTO PostMedia_Backup FROM PostMedia;
    PRINT N'✅ Đã backup bảng PostMedia vào PostMedia_Backup';
END
ELSE
BEGIN
    PRINT N'⚠️  Bảng PostMedia_Backup đã tồn tại, bỏ qua backup';
END

PRINT N'';
PRINT N'📊 URLs TRƯỚC KHI UPDATE:';
PRINT N'';

SELECT 
    media_id,
    post_id,
    media_type,
    media_url AS [Current URL],
    CASE 
        WHEN media_url LIKE 'http%' THEN N'✅ Already full URL'
        ELSE N'❌ Relative path - NEEDS UPDATE'
    END AS [Status]
FROM PostMedia
ORDER BY media_id;

PRINT N'';
PRINT N'========================================';
PRINT N'🔄 ĐANG CẬP NHẬT...';
PRINT N'========================================';
PRINT N'';

-- Update VIDEO URLs thành Big Buck Bunny (public video)
UPDATE PostMedia
SET media_url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
WHERE media_type = 'Video' 
  AND media_url NOT LIKE 'http%';

DECLARE @VideoUpdated INT = @@ROWCOUNT;
PRINT N'✅ Đã update ' + CAST(@VideoUpdated AS NVARCHAR) + N' video URLs';

-- Update IMAGE URLs thành Unsplash public images
UPDATE PostMedia
SET media_url = CASE media_id
    WHEN 4 THEN 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
    WHEN 5 THEN 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800'
    ELSE 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800'
END
WHERE media_type = 'Image'
  AND media_url NOT LIKE 'http%';

DECLARE @ImageUpdated INT = @@ROWCOUNT;
PRINT N'✅ Đã update ' + CAST(@ImageUpdated AS NVARCHAR) + N' image URLs';

PRINT N'';
PRINT N'========================================';
PRINT N'📊 URLs SAU KHI UPDATE:';
PRINT N'========================================';
PRINT N'';

SELECT 
    media_id,
    post_id,
    media_type,
    media_url AS [New URL],
    CASE 
        WHEN media_url LIKE 'http%' THEN N'✅ PUBLIC URL - READY!'
        ELSE N'❌ Still relative'
    END AS [Status]
FROM PostMedia
ORDER BY media_id;

PRINT N'';
PRINT N'========================================';
PRINT N'✅ CẬP NHẬT HOÀN TẤT!';
PRINT N'========================================';
PRINT N'';
PRINT N'🎬 VIDEO URLS ĐƯỢC SỬ DỤNG:';
PRINT N'   Big Buck Bunny - 10 phút';
PRINT N'   https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
PRINT N'';
PRINT N'🖼️ IMAGE URLS ĐƯỢC SỬ DỤNG:';
PRINT N'   Unsplash public images (high quality)';
PRINT N'';
PRINT N'========================================';
PRINT N'🧪 BÂY GIỜ HÃY TEST:';
PRINT N'========================================';
PRINT N'';
PRINT N'1. Mở Admin Logs: http://localhost:3001/admin-logs';
PRINT N'2. Tìm log có EntityType = "post"';
PRINT N'3. Click vào log → Modal mở';
PRINT N'4. VIDEO SẼ CHẠY ĐƯỢC! ✅';
PRINT N'5. IMAGE có thể click → Lightbox mở';
PRINT N'';
PRINT N'💡 NẾU CẦN KHÔI PHỤC VỀ URLs CŨ:';
PRINT N'   DELETE FROM PostMedia;';
PRINT N'   INSERT INTO PostMedia SELECT * FROM PostMedia_Backup;';
PRINT N'';
PRINT N'========================================';
PRINT N'';

GO
