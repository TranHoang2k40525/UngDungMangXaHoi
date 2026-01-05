# ================================================
# TEST VIDEO AFTER UPDATE
# Kiểm tra xem video đã chạy được chưa
# ================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTING VIDEO PLAYBACK" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Testing API response..." -ForegroundColor Yellow
Write-Host ""

try {
    # Test API endpoint
    $response = Invoke-RestMethod "http://localhost:5000/api/admin/activity-logs/entity-details?entityType=post&entityId=1"
    
    if ($response.success) {
        Write-Host "[OK] API is working!" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "Video URL from API:" -ForegroundColor Cyan
        if ($response.data.media) {
            foreach ($media in $response.data.media) {
                Write-Host "  Type: $($media.type)" -ForegroundColor White
                Write-Host "  URL:  $($media.url)" -ForegroundColor Cyan
                
                # Check if URL is valid
                if ($media.url -like "http*") {
                    Write-Host "  [OK] Full URL - Video should play!" -ForegroundColor Green
                    
                    # Try to test the URL
                    try {
                        $test = Invoke-WebRequest -Uri $media.url -Method Head -TimeoutSec 5 -ErrorAction Stop
                        if ($test.StatusCode -eq 200) {
                            Write-Host "  [OK] URL is accessible!" -ForegroundColor Green
                        }
                    } catch {
                        Write-Host "  [WARNING] Could not verify URL accessibility" -ForegroundColor Yellow
                    }
                } else {
                    Write-Host "  [ERROR] Still relative path!" -ForegroundColor Red
                }
                Write-Host ""
            }
        } else {
            Write-Host "  [INFO] No media found in post" -ForegroundColor Gray
        }
    } else {
        Write-Host "[ERROR] API returned unsuccessful response" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Cannot connect to API: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure backend is running at http://localhost:5000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2: Opening browser to test..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Opening Admin Logs page..." -ForegroundColor Gray
Start-Process "http://localhost:3001/admin-logs"

Write-Host ""
Write-Host "[INFO] Browser opened!" -ForegroundColor Green
Write-Host ""
Write-Host "MANUAL TESTING STEPS:" -ForegroundColor Cyan
Write-Host "  1. Find log with EntityType = 'post'" -ForegroundColor White
Write-Host "  2. Click on the log item" -ForegroundColor White
Write-Host "  3. Modal should open" -ForegroundColor White
Write-Host "  4. Click PLAY button on video" -ForegroundColor White
Write-Host "  5. Video should play! (Big Buck Bunny)" -ForegroundColor Green
Write-Host ""
Write-Host "EXPECTED RESULTS:" -ForegroundColor Cyan
Write-Host "  [OK] Video plays smoothly" -ForegroundColor Green
Write-Host "  [OK] Controls work (play, pause, volume, fullscreen)" -ForegroundColor Green
Write-Host "  [OK] Images show zoom icon on hover" -ForegroundColor Green
Write-Host "  [OK] Click image opens lightbox" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
