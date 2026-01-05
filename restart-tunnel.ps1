# Restart Quick Tunnel và lấy URL mới
# Usage: .\restart-tunnel.ps1

Write-Host "🔄 Đang restart Cloudflare Quick Tunnel..." -ForegroundColor Cyan

# Stop container cũ
wsl -d Ubuntu -- docker stop quick-tunnel 2>&1 | Out-Null
wsl -d Ubuntu -- docker rm quick-tunnel 2>&1 | Out-Null

# Start lại với docker-compose
Write-Host "🚀 Đang khởi động Quick Tunnel mới..." -ForegroundColor Yellow

wsl -d Ubuntu -- bash -c "cd /home/minhvu/ungdungmxh && docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.quicktunnel.yml up -d quick-tunnel"

# Đợi tunnel kết nối
Write-Host "⏳ Đợi 10 giây để tunnel kết nối với Cloudflare..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Lấy URL mới
Write-Host ""
& .\get-tunnel-url.ps1
