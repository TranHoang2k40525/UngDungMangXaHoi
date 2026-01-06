#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy application to WSL2 production environment
.DESCRIPTION
    This script deploys Docker images to WSL2 using docker-compose
.PARAMETER WebApiImage
    Full WebAPI image name with tag
.PARAMETER WebAppImage
    Full WebApp image name with tag
.PARAMETER WebAdminsImage
    Full WebAdmins image name with tag
.PARAMETER DbPassword
    Database password for secrets
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$WebApiImage,
    
    [Parameter(Mandatory=$true)]
    [string]$WebAppImage,
    
    [Parameter(Mandatory=$true)]
    [string]$WebAdminsImage,
    
    [Parameter(Mandatory=$true)]
    [string]$DbPassword,
    
    [Parameter(Mandatory=$false)]
    [string]$ProdDir = "/home/minhvu/ungdungmxh"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Deploying to WSL2 Production" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create deployment script for WSL2
$deployScript = @"
#!/bin/bash
set -e

echo '=== Pulling latest code ==='
cd $ProdDir
git pull origin main || echo 'Warning: git pull failed, continuing...'

echo ''
echo '=== Creating secrets ==='
mkdir -p secrets
echo '$DbPassword' > secrets/db_password.txt
chmod 600 secrets/db_password.txt

echo ''
echo '=== Setting image variables ==='
export WEBAPI_IMAGE='$WebApiImage'
export WEBAPP_IMAGE='$WebAppImage'
export WEBADMINS_IMAGE='$WebAdminsImage'

echo 'Images to deploy:'
echo "  WebAPI: \$WEBAPI_IMAGE"
echo "  WebApp: \$WEBAPP_IMAGE"
echo "  WebAdmins: \$WEBADMINS_IMAGE"

echo ''
echo '=== Creating Docker network ==='
docker network create app-network 2>/dev/null || echo 'Network already exists'

echo ''
echo '=== Pulling images from registry ==='
docker pull \$WEBAPI_IMAGE
docker pull \$WEBAPP_IMAGE
docker pull \$WEBADMINS_IMAGE

echo ''
echo '=== Stopping old containers ==='
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down webapi webapp webadmins 2>/dev/null || echo 'No containers to stop'

echo ''
echo '=== Starting new containers ==='
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d sqlserver webapi webapp webadmins

echo ''
echo '=== Waiting for containers to be healthy ==='
sleep 5

echo ''
echo '=== Container status ==='
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

echo ''
echo '=== Deployment completed! ==='
"@

# Write script to temp file
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$deployScript | Out-File -FilePath $tempScript -Encoding UTF8 -NoNewline

try {
    Write-Host "=== Copying deployment script to WSL2 ===" -ForegroundColor Yellow
    wsl -d Ubuntu -- bash -c "cat > /tmp/deploy.sh" < $tempScript
    wsl -d Ubuntu -- chmod +x /tmp/deploy.sh
    
    Write-Host ""
    Write-Host "=== Executing deployment in WSL2 ===" -ForegroundColor Yellow
    wsl -d Ubuntu -- bash /tmp/deploy.sh
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "   Deployment Successful!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "   Deployment Failed!" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        exit 1
    }
}
finally {
    # Cleanup
    if (Test-Path $tempScript) {
        Remove-Item $tempScript -Force
    }
    wsl -d Ubuntu -- rm -f /tmp/deploy.sh 2>$null
}
