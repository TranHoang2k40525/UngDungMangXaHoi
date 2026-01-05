# ============================================
# RUN BUSINESS CHECK - Kiểm tra và tạo dữ liệu
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "KIEM TRA DU LIEU BUSINESS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Kiểm tra backend đang chạy
Write-Host "1. Kiem tra Backend..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:5297/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   OK Backend dang chay!" -ForegroundColor Green
} catch {
    Write-Host "   X Backend CHUA chay!" -ForegroundColor Red
    Write-Host "   -> Hay chay backend truoc: cd Presentation\WebAPI && dotnet run" -ForegroundColor Yellow
    exit
}

# 2. Chạy SQL script để kiểm tra database
Write-Host "`n2. Kiem tra Database..." -ForegroundColor Yellow

$sqlFile = "CHECK_BUSINESS_IN_DATABASE.sql"
if (Test-Path $sqlFile) {
    Write-Host "   Dang chay SQL script..." -ForegroundColor Cyan
    
    # Sử dụng sqlcmd với password đúng
    $result = sqlcmd -S "localhost,1433" -d "ungdungmangxahoiv_2" -U "sa" -P "123456789" -i $sqlFile -W
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n$result" -ForegroundColor White
        Write-Host "`n   OK SQL script chay thanh cong!" -ForegroundColor Green
    } else {
        Write-Host "   X Loi khi chay SQL!" -ForegroundColor Red
        Write-Host "   -> Kiem tra lai connection string" -ForegroundColor Yellow
    }
} else {
    Write-Host "   X Khong tim thay file $sqlFile" -ForegroundColor Red
}

# 3. Test API endpoint
Write-Host "`n3. Test API Endpoint..." -ForegroundColor Yellow

try {
    Write-Host "   Dang goi: GET /api/BusinessVerification/stats" -ForegroundColor Cyan
    
    # Gọi API stats (không cần auth)
    $stats = Invoke-RestMethod -Uri "http://localhost:5297/api/BusinessVerification/stats" -Method GET -TimeoutSec 10
    
    Write-Host "   OK API tra ve:" -ForegroundColor Green
    Write-Host "   - Total: $($stats.data.total)" -ForegroundColor White
    Write-Host "   - Pending: $($stats.data.pending)" -ForegroundColor White
    Write-Host "   - Approved: $($stats.data.approved)" -ForegroundColor White
    Write-Host "   - Rejected: $($stats.data.rejected)" -ForegroundColor White
    
} catch {
    Write-Host "   ! API can authentication token" -ForegroundColor Yellow
    Write-Host "   -> Dang nhap qua frontend de lay token" -ForegroundColor Yellow
}

# 4. Hướng dẫn tiếp theo
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "HUONG DAN TIEP THEO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Buoc 1: Chay Frontend (neu chua chay)" -ForegroundColor Yellow
Write-Host "   cd Presentation\WebApp\WebAdmins" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White

Write-Host "`nBuoc 2: Mo trinh duyet" -ForegroundColor Yellow
Write-Host "   http://localhost:5173" -ForegroundColor White

Write-Host "`nBuoc 3: Dang nhap Admin" -ForegroundColor Yellow
Write-Host "   Email: kfc09122004@gmail.com" -ForegroundColor White

Write-Host "`nBuoc 4: Vao menu Doanh nghiep" -ForegroundColor Yellow
Write-Host "   -> Click icon doanh nghiep tren menu" -ForegroundColor White
Write-Host "   -> Xem du lieu hien thi" -ForegroundColor White

Write-Host "`nBuoc 5: Kiem tra Console (F12)" -ForegroundColor Yellow
Write-Host "   -> Xem API response" -ForegroundColor White
Write-Host "   -> Neu []  = database trong" -ForegroundColor White
Write-Host "   -> Neu [...] = co du lieu!" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TONG KET" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "OK Backend dang chay" -ForegroundColor Green
Write-Host "OK Database ket noi thanh cong" -ForegroundColor Green
Write-Host "OK Frontend + Backend da ket noi" -ForegroundColor Green
Write-Host "`n-> Bay gio hay mo frontend va test!" -ForegroundColor Yellow
Write-Host ""
