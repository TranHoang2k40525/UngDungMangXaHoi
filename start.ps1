# Start All Containers Script
# Khởi động tất cả containers của dự án theo đúng thứ tự

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Starting All Containers" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Start SQL Server
Write-Host "[1/5] Starting SQL Server..." -ForegroundColor Yellow
docker start ungdungmxh-sqlserver-prod
Write-Host "      Waiting for SQL Server to be ready (10 seconds)..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Step 2: Start WebAPI
Write-Host "[2/5] Starting WebAPI..." -ForegroundColor Yellow
docker start ungdungmxh-webapi-prod
Write-Host "      Waiting for WebAPI to initialize (5 seconds)..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Step 3: Start Frontend
Write-Host "[3/5] Starting WebApp (Users)..." -ForegroundColor Yellow
docker start ungdungmxh-webapp-prod

Write-Host "[4/5] Starting WebAdmins..." -ForegroundColor Yellow
docker start ungdungmxh-webadmins-prod
Write-Host "      Waiting for Frontend to initialize (3 seconds)..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# Step 4: Start Quick Tunnels
Write-Host "[5/5] Starting Quick Tunnels..." -ForegroundColor Yellow
docker start quick-tunnel quick-tunnel-admin
Write-Host "      Waiting for tunnels to generate URLs (15 seconds)..." -ForegroundColor Gray
Start-Sleep -Seconds 15

# Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   All Containers Started!" -ForegroundColor Green
Write-Host "   Good morning! ☀️" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# Show running containers
Write-Host "Running containers:" -ForegroundColor Cyan
docker ps --filter "name=ungdungmxh" --filter "name=quick-tunnel" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Show Quick Tunnel URLs
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "   Public URLs (Quick Tunnel)" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

Write-Host "WebApp (Users):" -ForegroundColor Cyan
$webappUrl = docker logs quick-tunnel 2>&1 | Select-String "https://.*\.trycloudflare\.com" | Select-Object -First 1
if ($webappUrl) {
    Write-Host "  $webappUrl" -ForegroundColor Green
} else {
    Write-Host "  Generating... (check logs: docker logs quick-tunnel)" -ForegroundColor Yellow
}

Write-Host "`nWebAdmins:" -ForegroundColor Cyan
$adminUrl = docker logs quick-tunnel-admin 2>&1 | Select-String "https://.*\.trycloudflare\.com" | Select-Object -First 1
if ($adminUrl) {
    Write-Host "  $adminUrl" -ForegroundColor Green
} else {
    Write-Host "  Generating... (check logs: docker logs quick-tunnel-admin)" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Gray
Write-Host "Local Access:" -ForegroundColor Gray
Write-Host "  WebApp:    http://localhost:5273" -ForegroundColor Gray
Write-Host "  WebAdmins: http://localhost:5274" -ForegroundColor Gray
Write-Host "  WebAPI:    http://localhost:5397" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Gray
