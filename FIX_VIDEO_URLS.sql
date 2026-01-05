-- ================================================
-- FIX VIDEO URLs - Sử dụng Real Video URLs
-- Thay thế filenames bằng public video URLs
-- ================================================

USE UngDungMangXaHoi;
GO

PRINT N'🔧 Updating Media URLs to use real public URLs...';

-- Update existing media with real public URLs from sample video sources
UPDATE Media
SET url = CASE media_id
    -- Big Buck Bunny (634 seconds)
    WHEN (SELECT TOP 1 media_id FROM Media WHERE type = 'Video' ORDER BY media_id) 
        THEN 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    -- Elephant Dream (653 seconds)
    WHEN (SELECT media_id FROM Media WHERE type = 'Video' ORDER BY media_id OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY)
        THEN 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
    ELSE url
END
WHERE type = 'Video';

-- Update image URLs with Unsplash (already good URLs)
PRINT N'✅ Media URLs updated!';

-- Show updated media
SELECT 
    m.media_id,
    m.post_id,
    m.type,
    LEFT(m.url, 60) + '...' AS url_preview,
    m.order_index
FROM Media m
ORDER BY m.post_id, m.order_index;

PRINT N'';
PRINT N'========================================';
PRINT N'🎬 VIDEO URLs READY!';
PRINT N'========================================';
PRINT N'Videos now use public URLs from Google Test Videos';
PRINT N'Frontend should be able to play them directly!';
GO
