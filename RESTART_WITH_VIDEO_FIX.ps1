# ================================================
# RESTART BACKEND WITH VIDEO FIX
# Rebuild and restart backend API
# ================================================

Write-Host "🔄 Restarting Backend API..." -ForegroundColor Cyan
Write-Host ""

# Stop any running WebAPI processes
Write-Host "⏹️  Stopping running processes..." -ForegroundColor Yellow
Get-Process -Name "WebAPI" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -like "*WebAPI*"} | Stop-Process -Force

Start-Sleep -Seconds 2

# Navigate to WebAPI directory
$webApiPath = "Presentation\WebAPI"
if (Test-Path $webApiPath) {
    Push-Location $webApiPath
    
    Write-Host "🔨 Building WebAPI project..." -ForegroundColor Yellow
    dotnet build --no-incremental
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 Starting WebAPI..." -ForegroundColor Cyan
        Write-Host "   URL: http://localhost:5000" -ForegroundColor Gray
        Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
        Write-Host ""
        
        # Start in background
        Start-Process -FilePath "dotnet" -ArgumentList "run" -NoNewWindow
        
        Write-Host "⏳ Waiting for API to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        # Test if API is running
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
            Write-Host "✅ API is running!" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  API may not be ready yet, give it a few more seconds..." -ForegroundColor Yellow
        }
        
        Pop-Location
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "🎉 Backend Restart Complete!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📋 Next Steps:" -ForegroundColor Cyan
        Write-Host "1. Open Admin Logs: http://localhost:3001/admin-logs" -ForegroundColor White
        Write-Host "2. Click on a post log with media" -ForegroundColor White
        Write-Host "3. Video should now show full URL and play!" -ForegroundColor White
        Write-Host ""
        Write-Host "🔍 Test API Response:" -ForegroundColor Cyan
        Write-Host "   curl http://localhost:5000/api/admin/activity-logs" -ForegroundColor Gray
        Write-Host ""
        
    } else {
        Write-Host "❌ Build failed! Check errors above." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
} else {
    Write-Host "❌ WebAPI path not found: $webApiPath" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Gray
    exit 1
}
