# SETUP NEW DATABASE SCRIPT
# Purpose: Automated setup for ungdungmangxahoiv_3

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SETUP NEW DATABASE: ungdungmangxahoiv_3" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ServerName = "localhost"
$DatabaseName = "ungdungmangxahoiv_3"

# Step 1: Create new database
Write-Host "STEP 1: Creating new database..." -ForegroundColor Cyan
sqlcmd -S $ServerName -d master -i SQL\00_setup_new_database.sql
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Database created" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create database" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Create base tables
Write-Host "STEP 2: Creating base tables..." -ForegroundColor Cyan
sqlcmd -S $ServerName -d $DatabaseName -i SQL\00.sql
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Base tables created" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create base tables" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Create RBAC tables
Write-Host "STEP 3: Creating RBAC tables..." -ForegroundColor Cyan
sqlcmd -S $ServerName -d $DatabaseName -i SQL\create_rbac_tables.sql
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: RBAC tables created" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create RBAC tables" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Seed RBAC data
Write-Host "STEP 4: Seeding RBAC data..." -ForegroundColor Cyan
sqlcmd -S $ServerName -d $DatabaseName -i SQL\seed_rbac_data.sql
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: RBAC data seeded" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not seed RBAC data" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Verify
Write-Host "STEP 5: Verifying setup..." -ForegroundColor Cyan
sqlcmd -S $ServerName -d $DatabaseName -Q "SELECT COUNT(*) as RoleCount FROM Roles; SELECT COUNT(*) as PermissionCount FROM Permissions;"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DATABASE SETUP COMPLETED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database: $DatabaseName" -ForegroundColor White
Write-Host "Status: Ready" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Build: dotnet build" -ForegroundColor White
Write-Host "2. Run: dotnet run --project Presentation\WebAPI" -ForegroundColor White
Write-Host ""
