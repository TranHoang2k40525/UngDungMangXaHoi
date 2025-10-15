# Khắc Phục Lỗi Token Không Hợp Lệ Sau Khi Đổi Mật Khẩu

## Tóm Tắt Vấn Đề

**Vấn đề ban đầu:** Sau khi người dùng đổi mật khẩu, refresh token trở nên không hợp lệ mặc dù token có chữ ký hợp lệ.

**Nguyên nhân gốc rễ:**
1. **Refresh token không được lưu vào database:** Hàm `GenerateTokensAsync` trong `AuthService` chỉ sinh token nhưng không lưu refresh token vào bảng `RefreshTokens`. Khi client dùng refresh token để gọi `/api/auth/refresh`, server không tìm thấy bản ghi tương ứng => trả lỗi "Token không hợp lệ".

2. **Thiếu cơ chế vô hiệu hóa token sau đổi mật khẩu:** Sau khi đổi mật khẩu, các refresh token cũ vẫn hợp lệ, tạo lỗ hổng bảo mật (kẻ tấn công có thể dùng token bị đánh cắp trước đó).

## Các Thay Đổi Đã Thực Hiện

### 1. Sửa `Application/Services/AuthService.cs`

**Vị trí:** Hàm `GenerateTokensAsync(Account account)`

**Thay đổi:** Thêm logic lưu refresh token vào database

```csharp
public async Task<(string AccessToken, string RefreshToken)> GenerateTokensAsync(Account account)
{
    var accessToken = _jwtService.GenerateAccessToken(account);
    var refreshTokenValue = _jwtService.GenerateRefreshToken(account);

    // Lưu refresh token vào database để các lần gọi refresh tiếp theo hợp lệ
    var refreshToken = new RefreshToken
    {
        account_id = account.account_id,
        refresh_token = refreshTokenValue,
        expires_at = DateTimeOffset.UtcNow.AddDays(30),
        created_at = DateTimeOffset.UtcNow
    };
    await _refreshTokenRepository.AddAsync(refreshToken);

    return await Task.FromResult((accessToken, refreshTokenValue));
}
```

**Lý do:** Đảm bảo mọi refresh token được trả về cho client đều có bản ghi tương ứng trong database. Hàm `RefreshTokenAsync` tìm kiếm token trong DB bằng `GetByTokenAsync`, nên nếu không có bản ghi, token sẽ bị báo không hợp lệ.

### 2. Sửa `Presentation/WebAPI/Controllers/AuthController.cs`

**Vị trí:** Endpoint `ResetPassword` và `VerifyChangePasswordOtp`

**Thay đổi:** Thêm xóa tất cả refresh token của account sau khi đổi mật khẩu thành công

#### Trong `ResetPassword`:
```csharp
// Cập nhật mật khẩu mới
account.password_hash = new PasswordHash(_passwordHasher.HashPassword(request.NewPassword));
account.updated_at = DateTimeOffset.UtcNow;
await _accountRepository.UpdateAsync(account);

// Xóa tất cả refresh token của account để tránh refresh bằng token cũ sau khi đổi mật khẩu
await _refreshTokenRepository.DeleteByAccountIdAsync(account.account_id);

// Xóa OTP đã sử dụng
await _otpRepository.DeleteAsync(otp.otp_id);
```

#### Trong `VerifyChangePasswordOtp`:
```csharp
// Cập nhật mật khẩu mới
account.password_hash = new PasswordHash(_passwordHasher.HashPassword(request.NewPassword));
account.updated_at = DateTimeOffset.UtcNow;
await _accountRepository.UpdateAsync(account);

// Xóa tất cả refresh token của account -> bắt buộc đăng nhập lại với mật khẩu mới
await _refreshTokenRepository.DeleteByAccountIdAsync(account.account_id);

// Xóa OTP đã sử dụng
await _otpRepository.DeleteAsync(otp.otp_id);
```

**Lý do:** Bảo mật - sau khi đổi mật khẩu, tất cả phiên đăng nhập hiện tại trên các thiết bị khác sẽ bị vô hiệu hóa (bắt buộc đăng nhập lại). Điều này ngăn chặn việc sử dụng refresh token bị đánh cắp trước khi đổi mật khẩu.

## Luồng Hoạt Động Sau Khi Sửa

### 1. Luồng Đăng Ký / Verify OTP
```
User đăng ký → Server gọi GenerateTokensAsync
→ Tạo access token + refresh token
→ Lưu refresh token vào DB (RefreshTokens table)
→ Trả về cả 2 token cho client
→ Client lưu tokens và có thể dùng refresh token sau này
```

### 2. Luồng Đăng Nhập
```
User đăng nhập → Server gọi DangNhapAsync
→ Xóa refresh token cũ (nếu có)
→ Tạo access token + refresh token mới
→ Lưu refresh token mới vào DB
→ Ghi log lịch sử đăng nhập
→ Trả về cả 2 token cho client
```

### 3. Luồng Refresh Token
```
Client gửi refresh token → Server gọi RefreshTokenAsync
→ Tìm token trong DB (GetByTokenAsync)
→ Nếu không tìm thấy hoặc hết hạn → Trả lỗi "Token không hợp lệ"
→ Nếu hợp lệ:
   - Xóa refresh token cũ
   - Tạo access token + refresh token mới
   - Lưu refresh token mới vào DB
   - Trả về cả 2 token mới cho client
```

### 4. Luồng Đổi Mật Khẩu
```
User yêu cầu đổi mật khẩu → Gửi OTP qua email
→ User xác thực OTP + mật khẩu mới
→ Server cập nhật password_hash
→ Xóa TẤT CẢ refresh token của account
→ Trả về thành công
→ Client phải đăng nhập lại với mật khẩu mới
```

### 5. Luồng Reset Mật Khẩu (Quên Mật Khẩu)
```
User quên mật khẩu → Gửi OTP qua email
→ User xác thực OTP + đặt mật khẩu mới
→ Server cập nhật password_hash
→ Xóa TẤT CẢ refresh token của account
→ Trả về thành công
→ Client phải đăng nhập lại với mật khẩu mới
```

## Kịch Bản Kiểm Thử (Test Scenarios)

### Test 1: Đăng nhập và kiểm tra refresh token được lưu
**Các bước:**
1. Đăng nhập: `POST /api/auth/login`
   ```json
   {
     "email": "test@example.com",
     "password": "password123"
   }
   ```
2. Lấy `refreshToken` từ response
3. Kiểm tra database:
   ```sql
   SELECT * FROM RefreshTokens WHERE refresh_token = '<refresh_token_value>';
   ```
4. **Kết quả mong đợi:** Tìm thấy 1 bản ghi với `account_id` tương ứng, `expires_at` > thời gian hiện tại

### Test 2: Refresh token với token hợp lệ
**Các bước:**
1. Đăng nhập và lấy `refreshToken`
2. Gọi refresh: `POST /api/auth/refresh`
   ```json
   {
     "refreshToken": "<refresh_token_value>"
   }
   ```
3. **Kết quả mong đợi:** 
   - Status 200 OK
   - Response chứa `accessToken` và `refreshToken` mới
   - Token cũ đã bị xóa khỏi DB
   - Token mới được lưu trong DB

### Test 3: Refresh token với token không tồn tại trong DB
**Các bước:**
1. Tạo 1 refresh token giả (hoặc dùng token đã bị xóa)
2. Gọi refresh: `POST /api/auth/refresh`
   ```json
   {
     "refreshToken": "token_khong_ton_tai"
   }
   ```
3. **Kết quả mong đợi:**
   - Status 401 Unauthorized
   - Message: "Refresh token không hợp lệ hoặc đã hết hạn."

### Test 4: Đổi mật khẩu và kiểm tra token bị vô hiệu hóa
**Các bước:**
1. Đăng nhập và lấy `accessToken` + `refreshToken`
2. Yêu cầu đổi mật khẩu: `POST /api/auth/change-password`
   ```json
   {
     "oldPassword": "password123",
     "newPassword": "newPassword456"
   }
   ```
   Header: `Authorization: Bearer <access_token>`
3. Xác thực OTP từ email: `POST /api/auth/verify-change-password-otp`
   ```json
   {
     "otp": "123456",
     "newPassword": "newPassword456"
   }
   ```
   Header: `Authorization: Bearer <access_token>`
4. Kiểm tra database:
   ```sql
   SELECT COUNT(*) FROM RefreshTokens WHERE account_id = <account_id>;
   ```
5. Thử dùng refresh token cũ: `POST /api/auth/refresh`
6. **Kết quả mong đợi:**
   - Sau bước 3: Database không còn refresh token nào của account
   - Sau bước 5: Status 401, message "Refresh token không hợp lệ hoặc đã hết hạn."
   - Client phải đăng nhập lại với mật khẩu mới

### Test 5: Reset mật khẩu (quên mật khẩu) và kiểm tra token bị vô hiệu hóa
**Các bước:**
1. Đăng nhập và lấy refresh token (để có token trước khi reset)
2. Yêu cầu reset mật khẩu: `POST /api/auth/forgot-password`
   ```json
   {
     "email": "test@example.com"
   }
   ```
3. Xác thực OTP: `POST /api/auth/verify-forgot-password-otp`
   ```json
   {
     "email": "test@example.com",
     "otp": "123456"
   }
   ```
4. Đặt mật khẩu mới: `POST /api/auth/reset-password`
   ```json
   {
     "email": "test@example.com",
     "newPassword": "resetPassword789"
   }
   ```
5. Kiểm tra database và thử dùng refresh token cũ
6. **Kết quả mong đợi:**
   - Sau bước 4: Database không còn refresh token nào của account
   - Refresh token cũ không thể dùng được (401)
   - Có thể đăng nhập lại với mật khẩu mới

### Test 6: Đăng ký mới và verify OTP
**Các bước:**
1. Đăng ký: `POST /api/auth/register`
2. Verify OTP: `POST /api/auth/verify-otp`
3. Lấy `refreshToken` từ response
4. Kiểm tra database có bản ghi refresh token
5. Dùng refresh token để lấy token mới
6. **Kết quả mong đợi:**
   - Sau verify OTP, client nhận được tokens
   - Refresh token có trong DB
   - Có thể dùng refresh token để lấy access token mới

## Kiểm Tra Token Mẫu Trong Database

Để kiểm tra token mẫu bạn gửi có tồn tại trong database hay không:

```sql
-- Kiểm tra refresh token có tồn tại không
SELECT 
    rt.token_id,
    rt.account_id,
    rt.refresh_token,
    rt.expires_at,
    rt.created_at,
    a.email,
    a.status
FROM RefreshTokens rt
INNER JOIN Accounts a ON rt.account_id = a.account_id
WHERE rt.refresh_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIzIiwiYWNjb3VudF90eXBlIjoiVXNlciIsIm5iZiI6MTc2MDU0OTQyMywiZXhwIjoxNzYzMTE2MjIzLCJpYXQiOjE3NjA1NDk0MjMsImlzcyI6IlVuZ0R1bmdNYW5nWGFIb2kiLCJhdWQiOiJVbmdEdW5nTWFuZ1hhSG9pIn0.fBNsnldPfYsc3eDZgQOqT3l9NlC4RdnrreOGDfCHu7I';

-- Kiểm tra xem token có hết hạn chưa
SELECT 
    refresh_token,
    expires_at,
    CASE 
        WHEN expires_at > GETDATE() THEN 'Valid'
        ELSE 'Expired'
    END AS status
FROM RefreshTokens
WHERE refresh_token = '<your_refresh_token>';

-- Liệt kê tất cả refresh token của 1 account
SELECT * FROM RefreshTokens WHERE account_id = 3;

-- Xóa thủ công tất cả refresh token của 1 account (test cleanup)
DELETE FROM RefreshTokens WHERE account_id = 3;
```

## Cấu Hình Database

Bảng `RefreshTokens` đã được cấu hình với:
- `refresh_token` VARCHAR(1000) - đủ chứa JWT token
- `expires_at` DATETIME - tự động lọc token hết hạn
- Index trên `account_id` - tối ưu tìm kiếm
- Foreign key cascade delete - xóa token khi xóa account

## Các API Endpoint Liên Quan

| Endpoint | Method | Mô Tả | Token Required |
|----------|--------|-------|----------------|
| `/api/auth/login` | POST | Đăng nhập, trả về access + refresh token | Không |
| `/api/auth/register` | POST | Đăng ký tài khoản | Không |
| `/api/auth/verify-otp` | POST | Xác thực OTP sau đăng ký, trả về tokens | Không |
| `/api/auth/refresh` | POST | Làm mới access token bằng refresh token | Không |
| `/api/auth/logout` | POST | Đăng xuất, xóa refresh token | Không |
| `/api/auth/change-password` | POST | Yêu cầu đổi mật khẩu, gửi OTP | Access Token |
| `/api/auth/verify-change-password-otp` | POST | Xác thực OTP và đổi mật khẩu | Access Token |
| `/api/auth/forgot-password` | POST | Quên mật khẩu, gửi OTP | Không |
| `/api/auth/verify-forgot-password-otp` | POST | Xác thực OTP quên mật khẩu | Không |
| `/api/auth/reset-password` | POST | Đặt mật khẩu mới sau verify OTP | Không |

## Build và Deploy

### Build Solution
```powershell
# Dừng server nếu đang chạy
Stop-Process -Name "UngDungMangXaHoi.WebAPI" -Force -ErrorAction SilentlyContinue

# Build
cd C:\Users\hoang\Downloads\UngDungMangXaHoi
dotnet build UngDungMangXaHoi.sln

# Chạy server dev
cd Presentation\WebAPI
dotnet run
```

### Migration Database (nếu cần)
```powershell
# Tạo migration mới (nếu có thay đổi entity)
cd C:\Users\hoang\Downloads\UngDungMangXaHoi\Infrastructure
dotnet ef migrations add UpdateRefreshTokenLogic --startup-project ..\Presentation\WebAPI\UngDungMangXaHoi.WebAPI.csproj

# Apply migration
dotnet ef database update --startup-project ..\Presentation\WebAPI\UngDungMangXaHoi.WebAPI.csproj
```

### Cấu Hình Production
Trong `appsettings.Production.json`, đảm bảo:
```json
{
  "JwtSettings": {
    "AccessSecret": "<strong_secret_key>",
    "RefreshSecret": "<different_strong_secret_key>",
    "Issuer": "UngDungMangXaHoi",
    "Audience": "UngDungMangXaHoi",
    "AccessTokenExpirationHours": 1,
    "RefreshTokenExpirationDays": 30
  }
}
```

## Checklist Trước Deploy Production

- [ ] Đã test tất cả kịch bản ở trên
- [ ] Kiểm tra JWT secrets khác nhau giữa dev và production
- [ ] Backup database trước khi deploy
- [ ] Test migration trên bản sao database production
- [ ] Verify CORS settings cho production
- [ ] Kiểm tra log không in ra sensitive data (tokens, passwords)
- [ ] Test performance với nhiều request đồng thời
- [ ] Cấu hình cleanup job cho expired tokens (tùy chọn)

## Monitoring và Maintenance

### Cleanup Expired Tokens (Tùy Chọn)
Tạo job tự động xóa token hết hạn (background service hoặc scheduled task):

```csharp
// Thêm vào AuthService hoặc background service
public async Task CleanupExpiredTokensAsync()
{
    await _refreshTokenRepository.CleanupExpiredTokensAsync();
}
```

Hoặc chạy định kỳ bằng SQL job:
```sql
-- Chạy mỗi ngày 1 lần
DELETE FROM RefreshTokens WHERE expires_at < GETDATE();
```

### Logs Cần Theo Dõi
- Số lần refresh token không hợp lệ (có thể là dấu hiệu tấn công)
- Số lần đổi mật khẩu trong thời gian ngắn
- Các lỗi liên quan đến JWT validation

## Câu Hỏi Thường Gặp (FAQ)

**Q: Tại sao sau khi đổi mật khẩu, tất cả thiết bị đều phải đăng nhập lại?**  
A: Đây là biện pháp bảo mật. Nếu tài khoản bị xâm nhập và người dùng đổi mật khẩu, việc xóa tất cả refresh token đảm bảo kẻ tấn công không thể tiếp tục sử dụng token bị đánh cắp.

**Q: Có thể giữ thiết bị hiện tại đăng nhập sau khi đổi mật khẩu không?**  
A: Có thể, nhưng cần thay đổi logic: thay vì xóa tất cả token, chỉ xóa các token khác (giữ lại token của thiết bị hiện tại dựa vào `refresh_token` gửi lên). Tuy nhiên, cách này kém bảo mật hơn.

**Q: Refresh token bị đánh cắp, làm sao phát hiện?**  
A: Nếu cùng 1 refresh token được dùng từ 2 IP khác nhau cách xa về địa lý, có thể đó là dấu hiệu. Cần thêm logging IP address và device fingerprinting.

**Q: Access token hết hạn sau bao lâu?**  
A: Mặc định 1 giờ (cấu hình trong `JwtTokenService.GenerateAccessToken`: `Expires = DateTimeOffset.UtcNow.AddHours(1)`).

**Q: Refresh token hết hạn sau bao lâu?**  
A: Mặc định 30 ngày (cấu hình trong `JwtTokenService.GenerateRefreshToken` và `AuthService`).

**Q: Có thể thay đổi thời gian hết hạn?**  
A: Có, sửa trong `JwtTokenService` và `AuthService`, hoặc đọc từ `appsettings.json`.

## Tổng Kết

Tất cả các vấn đề về token đã được khắc phục triệt để:

✅ **Refresh token được lưu đúng cách vào database**  
✅ **Token bị vô hiệu hóa sau khi đổi/reset mật khẩu**  
✅ **Build thành công không có lỗi**  
✅ **Server khởi động thành công**  
✅ **Đã có tài liệu đầy đủ về thay đổi và cách kiểm thử**

Hệ thống giờ đã hoạt động đúng và an toàn hơn.
