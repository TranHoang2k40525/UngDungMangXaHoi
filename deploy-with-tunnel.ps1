# Deploy Production với Quick Tunnel và hiển thị URL
# Usage: .\deploy-with-tunnel.ps1

param(
    [string]$ImageTag = "latest"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   DEPLOY PRODUCTION + QUICK TUNNEL    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Copy docker-compose files sang WSL
Write-Host "📦 Copying docker-compose files to WSL..." -ForegroundColor Yellow
wsl -d Ubuntu -- bash -c "cp /mnt/c/chuyendetinghopdoan/banmoinhatnhat/UngDungMangXaHoi/docker-compose.yml /home/minhvu/ungdungmxh/"
wsl -d Ubuntu -- bash -c "cp /mnt/c/chuyendetinghopdoan/banmoinhatnhat/UngDungMangXaHoi/docker-compose.prod.yml /home/minhvu/ungdungmxh/"
wsl -d Ubuntu -- bash -c "cp /mnt/c/chuyendetinghopdoan/banmoinhatnhat/UngDungMangXaHoi/docker-compose.quicktunnel.yml /home/minhvu/ungdungmxh/"

# Set image tags
Write-Host "🏷️  Setting image tag: $ImageTag" -ForegroundColor Yellow

# Deploy containers
Write-Host "🚀 Deploying containers..." -ForegroundColor Green
wsl -d Ubuntu -- bash -c @"
cd /home/minhvu/ungdungmxh
export WEBAPI_IMAGE=docker.io/minhvu0809/ungdungmxh-webapi:$ImageTag
export WEBAPP_IMAGE=docker.io/minhvu0809/ungdungmxh-webapp:$ImageTag
export WEBADMINS_IMAGE=docker.io/minhvu0809/ungdungmxh-webadmins:$ImageTag

docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.quicktunnel.yml up -d
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    
    # Đợi containers khởi động
    Write-Host "⏳ Đợi containers khởi động (15 giây)..." -ForegroundColor Gray
    Start-Sleep -Seconds 15
    
    # Lấy và hiển thị URL
    Write-Host ""
    & .\get-tunnel-url.ps1
    
    Write-Host ""
    Write-Host "📊 Container Status:" -ForegroundColor Cyan
    wsl -d Ubuntu -- docker ps --filter "name=ungdungmxh" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed! Check logs:" -ForegroundColor Red
    Write-Host "   wsl -d Ubuntu -- docker logs ungdungmxh-webapi-prod" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
