# Stop All Containers Script
# Dừng tất cả containers của dự án

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "   Stopping All Containers" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

Write-Host "Stopping Quick Tunnels..." -ForegroundColor Cyan
docker stop quick-tunnel quick-tunnel-admin 2>$null

Write-Host "Stopping Frontend..." -ForegroundColor Cyan
docker stop ungdungmxh-webapp-prod ungdungmxh-webadmins-prod 2>$null

Write-Host "Stopping WebAPI..." -ForegroundColor Cyan
docker stop ungdungmxh-webapi-prod 2>$null

Write-Host "Stopping SQL Server..." -ForegroundColor Cyan
docker stop ungdungmxh-sqlserver-prod 2>$null

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   All Containers Stopped!" -ForegroundColor Green
Write-Host "   Good night! 😴" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# Show stopped containers
Write-Host "Stopped containers:" -ForegroundColor Gray
docker ps -a --filter "name=ungdungmxh" --filter "name=quick-tunnel" --format "table {{.Names}}\t{{.Status}}" | Select-Object -First 7
