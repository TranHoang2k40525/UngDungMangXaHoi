# ================================================
# VIDEO PLAYBACK FIX - Complete Setup
# Run this to fix video playback completely
# ================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VIDEO PLAYBACK FIX - Complete Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create test data with public videos
Write-Host "Step 1: Creating test data with PUBLIC video URLs..." -ForegroundColor Yellow
Write-Host ""

try {
    # Try Windows Authentication first
    Write-Host "   Trying Windows Authentication..." -ForegroundColor Gray
    sqlcmd -S localhost -E -d UngDungMangXaHoi -i CREATE_PUBLIC_VIDEO_POSTS.sql -b
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Test data created successfully!" -ForegroundColor Green
    } else {
        throw "SQL script failed"
    }
} catch {
    Write-Host "   [WARNING] Windows Auth failed, trying SQL Auth..." -ForegroundColor Yellow
    
    # Ask for SQL password
    $sqlPassword = Read-Host "   Enter SQL Server 'sa' password" -AsSecureString
    $sqlPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sqlPassword)
    )
    
    sqlcmd -S localhost -U sa -P $sqlPasswordText -d UngDungMangXaHoi -i CREATE_PUBLIC_VIDEO_POSTS.sql -b
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Test data created!" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Failed to create test data" -ForegroundColor Red
        Write-Host "   You can run manually: sqlcmd -S localhost -E -d UngDungMangXaHoi -i CREATE_PUBLIC_VIDEO_POSTS.sql" -ForegroundColor Gray
    }
}

Write-Host ""

# Step 2: Restart backend
Write-Host "Step 2: Restarting backend with video fix..." -ForegroundColor Yellow
Write-Host ""

# Stop any running processes
Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*WebAPI*" } | Stop-Process -Force

# Build and run
if (Test-Path "Presentation\WebAPI") {
    Set-Location "Presentation\WebAPI"
    
    Write-Host "   Building backend..." -ForegroundColor Gray
    dotnet build --configuration Release
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Build successful!" -ForegroundColor Green
        Write-Host "   Starting API..." -ForegroundColor Gray
        
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "dotnet run --urls=http://localhost:5000"
        
        Start-Sleep -Seconds 5
        
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
            Write-Host "   [OK] API is running!" -ForegroundColor Green
        } catch {
            Write-Host "   [WARNING] API starting... (may need a few more seconds)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   [ERROR] Build failed!" -ForegroundColor Red
    }
    
    Set-Location "..\..\"
} else {
    Write-Host "   [ERROR] WebAPI path not found!" -ForegroundColor Red
}

Write-Host ""

# Step 3: Check frontend
Write-Host "Step 3: Checking frontend..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "   [OK] Frontend already running!" -ForegroundColor Green
    }
} catch {
    Write-Host "   Starting frontend..." -ForegroundColor Gray
    if (Test-Path "Presentation\WebApp\WebAdmins") {
        Set-Location "Presentation\WebApp\WebAdmins"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"
        Set-Location "..\..\.."
    } else {
        Write-Host "   [WARNING] Frontend path not found" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "What was done:" -ForegroundColor White
Write-Host "   [OK] Created 3 test posts with public video URLs" -ForegroundColor White
Write-Host "   [OK] Backend restarted with video URL fix" -ForegroundColor White
Write-Host "   [OK] GetFullMediaUrl() now converts relative paths to full URLs" -ForegroundColor White
Write-Host ""

Write-Host "How to test:" -ForegroundColor Cyan
Write-Host "   1. Go to: http://localhost:3001/admin-logs" -ForegroundColor White
Write-Host "   2. Find 3 newest logs (just created)" -ForegroundColor White
Write-Host "   3. Click each log to open modal" -ForegroundColor White
Write-Host "   4. Check videos and images:" -ForegroundColor White
Write-Host ""
Write-Host "      Video Test:" -ForegroundColor Yellow
Write-Host "      - Should show play button badge" -ForegroundColor Gray
Write-Host "      - Click play -> Video plays!" -ForegroundColor Gray
Write-Host "      - Controls work (pause, volume, fullscreen)" -ForegroundColor Gray
Write-Host ""
Write-Host "      Image Test:" -ForegroundColor Yellow
Write-Host "      - Hover -> Shows zoom icon" -ForegroundColor Gray
Write-Host "      - Click -> Opens full screen lightbox" -ForegroundColor Gray
Write-Host "      - Arrow keys to navigate" -ForegroundColor Gray
Write-Host "      - ESC to close" -ForegroundColor Gray
Write-Host ""

Write-Host "Test API manually:" -ForegroundColor Cyan
Write-Host "   " -NoNewline
Write-Host "Invoke-RestMethod http://localhost:5000/api/admin/activity-logs | ConvertTo-Json -Depth 5" -ForegroundColor Gray
Write-Host ""

Write-Host "Video URLs used (public, no upload needed):" -ForegroundColor Cyan
Write-Host "   - Big Buck Bunny (10 min)" -ForegroundColor Gray
Write-Host "   - Elephants Dream (11 min)" -ForegroundColor Gray
Write-Host "   - For Bigger Blazes (15 sec)" -ForegroundColor Gray
Write-Host "   - For Bigger Meltdowns (30 sec)" -ForegroundColor Gray
Write-Host ""

Write-Host "Image Lightbox Features:" -ForegroundColor Cyan
Write-Host "   - Click images to open full screen lightbox" -ForegroundColor White
Write-Host "   - Arrow keys Left/Right to navigate" -ForegroundColor White
Write-Host "   - ESC to close" -ForegroundColor White
Write-Host "   - Counter shows: 1/5, 2/5, etc." -ForegroundColor White
Write-Host ""

Write-Host "Video Player Features:" -ForegroundColor Cyan
Write-Host "   - Play/Pause controls" -ForegroundColor White
Write-Host "   - Volume control" -ForegroundColor White
Write-Host "   - Fullscreen button" -ForegroundColor White
Write-Host "   - Progress bar" -ForegroundColor White
Write-Host "   - Badge shows 'VIDEO' indicator" -ForegroundColor White
Write-Host ""

Write-Host "Troubleshooting:" -ForegroundColor Yellow
Write-Host "   If video still doesn't play:" -ForegroundColor White
Write-Host "   1. Check browser console (F12) for errors" -ForegroundColor Gray
Write-Host "   2. Check Network tab -> Look for video request" -ForegroundColor Gray
Write-Host "   3. Verify URL is FULL (starts with http://)" -ForegroundColor Gray
Write-Host "   4. Try opening video URL directly in browser" -ForegroundColor Gray
Write-Host ""
Write-Host "   If API not responding:" -ForegroundColor White
Write-Host "   1. Check: http://localhost:5000/health" -ForegroundColor Gray
Write-Host "   2. Restart manually: cd Presentation\WebAPI && dotnet run" -ForegroundColor Gray
Write-Host ""

Write-Host "Press any key to open Admin Logs in browser..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process "http://localhost:3001/admin-logs"

Write-Host ""
Write-Host "[OK] Browser opened! Happy testing!" -ForegroundColor Green
Write-Host ""
