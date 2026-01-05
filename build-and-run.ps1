# ========================================
# BUILD AND RUN APPLICATION
# Purpose: Build, migrate database, and run application
# ========================================

param(
    [switch]$SkipMigration,
    [switch]$DockerMode
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BUILD AND RUN APPLICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if database migration is needed
if (-not $SkipMigration) {
    Write-Host "Checking database..." -ForegroundColor Yellow
    
    $dbExists = sqlcmd -S localhost -Q "SELECT name FROM sys.databases WHERE name = 'ungdungmangxahoiv_3'" -h -1
    
    if ([string]::IsNullOrWhiteSpace($dbExists)) {
        Write-Host "Database not found. Running setup..." -ForegroundColor Yellow
        Write-Host ""
        
        # Run database setup
        .\setup-new-database.ps1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Database setup failed. Exiting..." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✓ Database exists: ungdungmangxahoiv_3" -ForegroundColor Green
        Write-Host ""
    }
}

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
dotnet clean --verbosity quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Clean completed" -ForegroundColor Green
} else {
    Write-Host "✗ Clean failed" -ForegroundColor Red
}
Write-Host ""

# Restore NuGet packages
Write-Host "Restoring NuGet packages..." -ForegroundColor Yellow
dotnet restore --verbosity quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Restore completed" -ForegroundColor Green
} else {
    Write-Host "✗ Restore failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Build solution
Write-Host "Building solution..." -ForegroundColor Yellow
dotnet build --no-restore --configuration Release --verbosity quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Build completed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

if ($DockerMode) {
    # Run with Docker Compose
    Write-Host "Starting application with Docker Compose..." -ForegroundColor Cyan
    Write-Host ""
    docker-compose up --build
} else {
    # Run locally
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Starting WebAPI..." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Yellow
    Write-Host ""
    
    # Set environment for development
    $env:ASPNETCORE_ENVIRONMENT = "Development"
    
    # Run the application
    dotnet run --project Presentation\WebAPI --no-build --configuration Release
}
