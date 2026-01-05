-- ================================================
-- UPDATE EXISTING MEDIA TO PUBLIC VIDEO URLs
-- Cập nhật video hiện tại thành public URLs
-- ================================================

USE UngDungMangXaHoi;
GO

PRINT N'';
PRINT N'========================================';
PRINT N'CẬP NHẬT MEDIA URLs HIỆN TẠI';
PRINT N'========================================';
PRINT N'';

-- Xem media hiện tại
PRINT N'📋 Media hiện tại trong database:';
PRINT N'';

SELECT 
    m.media_id,
    m.post_id,
    m.media_type AS [Type],
    m.media_url AS [Current URL],
    LEFT(p.caption, 50) + '...' AS [Post Caption]
FROM Media m
INNER JOIN Posts p ON m.post_id = p.post_id
ORDER BY m.media_id;

PRINT N'';
PRINT N'========================================';
PRINT N'';

-- Backup current URLs trước khi update
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Media_Backup')
BEGIN
    SELECT * INTO Media_Backup FROM Media;
    PRINT N'✅ Đã backup bảng Media vào Media_Backup';
END
ELSE
BEGIN
    PRINT N'⚠️  Bảng Media_Backup đã tồn tại, bỏ qua backup';
END

PRINT N'';
PRINT N'🔄 Đang cập nhật URLs...';
PRINT N'';

-- Update video URLs thành public URLs
UPDATE Media
SET media_url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
WHERE media_type = 'Video' 
  AND (media_url LIKE '%.mp4' OR media_url LIKE '%.avi' OR media_url LIKE '%.mov')
  AND media_url NOT LIKE 'http%';

PRINT N'✅ Đã update ' + CAST(@@ROWCOUNT AS NVARCHAR) + N' video URLs';

-- Update image URLs nếu cần (optional)
UPDATE Media
SET media_url = CASE 
    WHEN media_order = 1 THEN 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
    WHEN media_order = 2 THEN 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800'
    WHEN media_order = 3 THEN 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800'
    WHEN media_order = 4 THEN 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800'
    ELSE 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800'
END
WHERE media_type = 'Image'
  AND (media_url LIKE '%.jpg' OR media_url LIKE '%.png' OR media_url LIKE '%.jpeg')
  AND media_url NOT LIKE 'http%';

PRINT N'✅ Đã update ' + CAST(@@ROWCOUNT AS NVARCHAR) + N' image URLs';

PRINT N'';
PRINT N'========================================';
PRINT N'';

-- Verify updated URLs
PRINT N'📊 Media URLs sau khi update:';
PRINT N'';

SELECT 
    m.media_id,
    m.post_id,
    m.media_type AS [Type],
    m.media_url AS [New URL],
    CASE 
        WHEN m.media_url LIKE 'http%' THEN N'✅ Public URL'
        ELSE N'❌ Still relative'
    END AS [Status]
FROM Media m
ORDER BY m.media_id;

PRINT N'';
PRINT N'========================================';
PRINT N'✅ CẬP NHẬT HOÀN TẤT!';
PRINT N'========================================';
PRINT N'';
PRINT N'🧪 Bây giờ hãy test:';
PRINT N'1. Refresh trang Admin Logs';
PRINT N'2. Click vào log có video';
PRINT N'3. Video sẽ CHẠY ĐƯỢC!';
PRINT N'';
PRINT N'💡 Nếu muốn khôi phục URLs cũ:';
PRINT N'   DELETE FROM Media;';
PRINT N'   INSERT INTO Media SELECT * FROM Media_Backup;';
PRINT N'';

GO
