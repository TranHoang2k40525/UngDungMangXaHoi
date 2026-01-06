# Check Status Script
# Kiểm tra trạng thái tất cả containers

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Container Status" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Show all project containers
docker ps -a --filter "name=ungdungmxh" --filter "name=quick-tunnel" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Count running containers
$runningCount = (docker ps --filter "name=ungdungmxh" --filter "name=quick-tunnel" --format "{{.Names}}").Count
$totalCount = (docker ps -a --filter "name=ungdungmxh" --filter "name=quick-tunnel" --format "{{.Names}}").Count

Write-Host "`n========================================" -ForegroundColor Gray
Write-Host "Running: $runningCount / $totalCount containers" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Gray

# Show Quick Tunnel URLs if running
$quickTunnelRunning = docker ps --filter "name=quick-tunnel" --format "{{.Names}}"
if ($quickTunnelRunning) {
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "   Quick Tunnel URLs" -ForegroundColor Magenta
    Write-Host "========================================`n" -ForegroundColor Magenta
    
    Write-Host "WebApp (Users):" -ForegroundColor Cyan
    docker logs quick-tunnel 2>&1 | Select-String "https://.*\.trycloudflare\.com" | Select-Object -First 1
    
    Write-Host "`nWebAdmins:" -ForegroundColor Cyan
    docker logs quick-tunnel-admin 2>&1 | Select-String "https://.*\.trycloudflare\.com" | Select-Object -First 1
    
    Write-Host ""
}
