# Restart All Containers Script
# Restart tất cả containers (nhanh hơn stop + start)

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "   Restarting All Containers" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

Write-Host "Restarting all services..." -ForegroundColor Cyan
docker restart ungdungmxh-sqlserver-prod ungdungmxh-webapi-prod ungdungmxh-webapp-prod ungdungmxh-webadmins-prod quick-tunnel quick-tunnel-admin

Write-Host "`nWaiting for services to be ready (15 seconds)..." -ForegroundColor Gray
Start-Sleep -Seconds 15

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   All Containers Restarted!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# Show running containers
docker ps --filter "name=ungdungmxh" --filter "name=quick-tunnel" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
