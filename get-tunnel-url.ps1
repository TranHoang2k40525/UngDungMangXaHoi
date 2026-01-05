# Get Cloudflare Quick Tunnel URLs
# Usage: .\get-tunnel-url.ps1

Write-Host "Dang tim Cloudflare Quick Tunnel URLs..." -ForegroundColor Cyan

# Doi 2 giay de tunnel khoi dong
Start-Sleep -Seconds 2

# Lay logs tu container quick-tunnel (WebApp)
$logsWebApp = wsl -d Ubuntu -- docker logs quick-tunnel 2>&1
$urlWebApp = $logsWebApp | Select-String -Pattern 'https://[a-z0-9\-]+\.trycloudflare\.com' | Select-Object -Last 1

# Lay logs tu container quick-tunnel-admin (WebAdmin)
$logsAdmin = wsl -d Ubuntu -- docker logs quick-tunnel-admin 2>&1
$urlAdmin = $logsAdmin | Select-String -Pattern 'https://[a-z0-9\-]+\.trycloudflare\.com' | Select-Object -Last 1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CLOUDFLARE QUICK TUNNEL URLs        " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($urlWebApp) {
    $webappUrl = $urlWebApp.Matches.Value
    Write-Host "WebApp (User):  " -NoNewline -ForegroundColor Green
    Write-Host "$webappUrl" -ForegroundColor Yellow
} else {
    Write-Host "WebApp (User):  " -NoNewline -ForegroundColor Red
    Write-Host "Khong tim thay" -ForegroundColor Gray
}

if ($urlAdmin) {
    $adminUrl = $urlAdmin.Matches.Value
    Write-Host "WebAdmin:       " -NoNewline -ForegroundColor Green
    Write-Host "$adminUrl" -ForegroundColor Yellow
} else {
    Write-Host "WebAdmin:       " -NoNewline -ForegroundColor Red
    Write-Host "Khong tim thay" -ForegroundColor Gray
}

Write-Host ""
Write-Host "API Test:       ${webappUrl}/api/health" -ForegroundColor Magenta
Write-Host ""
Write-Host "Luu y: URLs nay se thay doi khi restart containers!" -ForegroundColor Yellow
Write-Host ""

# Copy WebApp URL vao clipboard
if ($webappUrl) {
    Set-Clipboard -Value $webappUrl
    Write-Host "WebApp URL da duoc copy vao clipboard!" -ForegroundColor Green
} else {
    Write-Host "Loi: Khong the copy URL" -ForegroundColor Red
    Write-Host "Kiem tra: wsl -d Ubuntu -- docker ps | grep tunnel" -ForegroundColor Gray
}

Write-Host ""
