# 📚 TÀI LIỆU MODULE QUẢN LÝ TÀI KHOẢN (AUTHENTICATION)

## 📋 Mục Lục
1. [Tổng quan](#tổng-quan)
2. [Luồng đăng ký](#luồng-đăng-ký)
3. [Luồng đăng nhập](#luồng-đăng-nhập)
4. [Luồng quên mật khẩu](#luồng-quên-mật-khẩu)
5. [Luồng đổi mật khẩu](#luồng-đổi-mật-khẩu)
6. [Bảo mật](#bảo-mật)
7. [API Endpoints](#api-endpoints)
8. [Lỗi thường gặp](#lỗi-thường-gặp)

---

## 🎯 Tổng quan

Module Authentication quản lý toàn bộ quy trình xác thực người dùng, bao gồm:
- ✅ Đăng ký tài khoản (User & Admin)
- ✅ Đăng nhập/Đăng xuất
- ✅ Quên mật khẩu
- ✅ Đổi mật khẩu
- ✅ Làm mới token (Refresh Token)
- ✅ Xác thực OTP qua email

### 🏗️ Kiến trúc

```
┌─────────────────┐
│  AuthController │  ← API Layer (Presentation)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   AuthService   │  ← Business Logic (Application)
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Repositories (Infrastructure)      │
│  - AccountRepository                │
│  - UserRepository                   │
│  - OTPRepository                    │
│  - RefreshTokenRepository           │
└─────────────────────────────────────┘
```

---

## � Sơ Đồ Tổng Quan

### Sequence Diagram - Complete Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant BCrypt
    participant DB
    participant Email
    participant JWT

    Note over User,JWT: REGISTRATION FLOW
    User->>API: POST /api/auth/register
    API->>API: Validate Input
    API->>DB: Check Email Exists
    API->>BCrypt: Hash Password
    API->>DB: Create Account + User
    API->>API: Generate OTP
    API->>Email: Send OTP
    API-->>User: Success

    Note over User,JWT: OTP VERIFICATION
    User->>API: POST /api/auth/verify-otp
    API->>BCrypt: Verify OTP
    API->>DB: Activate Account
    API->>JWT: Generate Tokens
    API-->>User: {accessToken, refreshToken}

    Note over User,JWT: LOGIN FLOW
    User->>API: POST /api/auth/login
    API->>DB: Get Account
    API->>BCrypt: Verify Password
    API->>JWT: Generate Tokens
    API-->>User: {tokens, user}
```

---

## �🔐 Luồng Đăng Ký (Registration)

### 📊 Sơ đồ luồng User Registration

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant Validator
    participant AccountRepo
    participant UserRepo
    participant OTPRepo
    participant EmailService

    Client->>AuthController: POST /api/auth/register
    AuthController->>Validator: Validate input
    Validator-->>AuthController: Valid/Invalid
    
    AuthController->>AccountRepo: Check email exists
    AuthController->>AccountRepo: Check phone exists
    AuthController->>UserRepo: Check username exists
    
    AuthController->>AccountRepo: Create Account (status=pending)
    AuthController->>UserRepo: Create User
    
    AuthController->>OTPRepo: Generate & Save OTP (expires in 1 min)
    AuthController->>EmailService: Send OTP Email
    
    AuthController-->>Client: Success - OTP sent
    
    Note over Client: User nhập OTP
    
    Client->>AuthController: POST /api/auth/verify-otp
    AuthController->>OTPRepo: Verify OTP
    AuthController->>AccountRepo: Update status=active
    AuthController->>AuthService: Generate JWT tokens
    
    AuthController-->>Client: Access Token + Refresh Token
```

### 🔁 Sơ đồ tuần tự (Mermaid)

```mermaid
sequenceDiagram
  participant Mobile
  participant WebAPI
  participant AuthService
  participant UserRepo
  participant DB

  Mobile->>WebAPI: POST /api/auth/login {username,password}
  WebAPI->>AuthService: ValidateCredentials(dto)
  AuthService->>UserRepo: GetByUsername(username)
  UserRepo->>DB: SELECT user
  DB-->>UserRepo: user record
  UserRepo-->>AuthService: user entity
  AuthService->>AuthService: Verify password (BCrypt)
  AuthService->>WebAPI: GenerateAccessToken + RefreshToken
  WebAPI-->>Mobile: 200 {accessToken, refreshToken}

  Note over AuthService: store refresh token in DB or cache
```

### 📝 Chi tiết các bước

#### Bước 1: Gửi thông tin đăng ký
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "username": "nguyenvana",
  "fullName": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "phone": "0123456789",
  "password": "MatKhau@123",
  "dateOfBirth": "1990-01-01",
  "gender": "Nam"
}
```

**Validation Rules:**
- ✅ Username: 3-50 ký tự, chỉ chữ, số, gạch dưới
- ✅ Email: định dạng email hợp lệ
- ✅ Phone: số điện thoại Việt Nam (10-11 số)
- ✅ Password: tối thiểu 8 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt
- ✅ DateOfBirth: phải trên 13 tuổi

**Logic xử lý:**
```csharp
1. Validate dữ liệu đầu vào (UserValidator)
2. Kiểm tra email đã tồn tại → return BadRequest
3. Kiểm tra phone đã tồn tại → return BadRequest  
4. Kiểm tra username đã tồn tại → return BadRequest
5. Kiểm tra rate limit (>= 5 lần thử) → return 429
6. Tạo Account với status="pending"
7. Hash password bằng BCrypt
8. Tạo User record
9. Generate OTP 6 số (expires in 1 minute)
10. Gửi OTP qua email
11. Return success message
```

#### Bước 2: Xác thực OTP
**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**
```json
{
  "email": "nguyenvana@example.com",
  "otp": "123456"
}
```

**Logic xử lý:**
```csharp
1. Tìm Account theo email với status="pending"
2. Lấy OTP từ database (purpose="register")
3. Kiểm tra OTP hết hạn → return BadRequest
4. Kiểm tra rate limit (>= 5 lần sai) → return 429
5. Verify OTP hash với BCrypt
6. Nếu sai → tăng failed_attempts, return BadRequest
7. Nếu đúng:
   - Update Account: status="active", otp.used=true
   - Generate JWT Access Token (expires in 15 minutes)
   - Generate Refresh Token (expires in 30 days)
   - Lưu Refresh Token vào database
   - Return tokens
```

**Response:**
```json
{
  "AccessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "RefreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 🔑 Luồng Đăng Nhập (Login)

### 📊 Sơ đồ luồng Login

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AccountRepo
    participant PasswordHasher
    participant AuthService
    participant RefreshTokenRepo
    participant LoginHistoryRepo

    Client->>AuthController: POST /api/auth/login
    AuthController->>AccountRepo: Find by email/phone
    
    alt Account not found or inactive
        AuthController-->>Client: 401 Unauthorized
    end
    
    AuthController->>PasswordHasher: Verify password
    
    alt Password incorrect
        AuthController-->>Client: 401 Unauthorized
    end
    
    AuthController->>RefreshTokenRepo: Delete old refresh tokens
    AuthController->>AuthService: Generate JWT tokens
    AuthController->>RefreshTokenRepo: Save new refresh token
    AuthController->>LoginHistoryRepo: Log login (IP, device)
    
    AuthController-->>Client: Access Token + Refresh Token
```

### 📝 Chi tiết Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "nguyenvana@example.com",
  "phone": "",
  "password": "MatKhau@123"
}
```

**Logic xử lý:**
```csharp
1. Tìm Account theo email HOẶC phone
2. Kiểm tra Account tồn tại và status="active" → else 401
3. Verify password với BCrypt → else 401
4. Lấy IP address và User-Agent từ HTTP request
5. Xóa tất cả Refresh Token cũ của account
6. Generate JWT Access Token (15 min)
7. Generate Refresh Token (30 days)
8. Lưu Refresh Token vào database
9. Ghi log đăng nhập (LoginHistory): IP, device, timestamp
10. Return tokens
```

**Response:**
```json
{
  "AccessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "RefreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 🔄 Làm mới Token (Refresh Token)

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Logic:**
```csharp
1. Tìm Refresh Token trong database
2. Kiểm tra token tồn tại và chưa hết hạn → else 401
3. Lấy Account từ token
4. Kiểm tra Account active → else 401
5. Xóa Refresh Token cũ
6. Generate JWT tokens mới
7. Lưu Refresh Token mới
8. Return tokens mới
```

---

## 🔓 Luồng Quên Mật Khẩu (Forgot Password)

### 📊 Sơ đồ luồng Forgot Password

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AccountRepo
    participant OTPRepo
    participant EmailService
    participant PasswordHasher

    Client->>AuthController: POST /api/auth/forgot-password
    AuthController->>AccountRepo: Find by email
    
    alt Account not found or inactive
        AuthController-->>Client: 400 BadRequest
    end
    
    AuthController->>OTPRepo: Check rate limit (<5 attempts)
    AuthController->>OTPRepo: Generate & Save OTP (expires in 1 min)
    AuthController->>EmailService: Send OTP Email
    AuthController-->>Client: Success - OTP sent
    
    Note over Client: User nhập OTP + Password mới
    
    Client->>AuthController: POST /api/auth/reset-password-with-otp
    AuthController->>OTPRepo: Verify OTP
    AuthController->>PasswordHasher: Hash new password
    AuthController->>AccountRepo: Update password
    AuthController->>RefreshTokenRepo: Delete all refresh tokens
    AuthController->>OTPRepo: Delete used OTP
    
    AuthController-->>Client: Success - Password reset
```

### 📝 Chi tiết Forgot Password

#### Bước 1: Yêu cầu OTP
**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "nguyenvana@example.com"
}
```

**Logic:**
```csharp
1. Tìm Account theo email với status="active"
2. Kiểm tra rate limit (<5 lần trong 2 phút) → else 429
3. Lấy tên người dùng (User/Admin)
4. Generate OTP 6 số (expires in 1 minute)
5. Hash OTP và lưu vào database (purpose="forgot_password")
6. Gửi OTP qua email
7. Return success message
```

#### Bước 2: Reset Password (Phương pháp 1 - Khuyên dùng)
**Endpoint:** `POST /api/auth/reset-password-with-otp`

**Request Body:**
```json
{
  "email": "nguyenvana@example.com",
  "otp": "123456",
  "newPassword": "MatKhauMoi@456"
}
```

**Logic:**
```csharp
1. Tìm Account theo email với status="active"
2. Lấy OTP từ database (purpose="forgot_password")
3. Kiểm tra OTP hết hạn → return BadRequest
4. Kiểm tra rate limit (>= 5 lần sai) → return 429
5. Verify OTP hash
6. Nếu sai → tăng failed_attempts, return BadRequest
7. Nếu đúng:
   - Hash password mới bằng BCrypt
   - Update Account.password_hash
   - Xóa TẤT CẢ Refresh Token (bắt buộc login lại)
   - Xóa OTP đã sử dụng
   - Return success
```

#### Bước 2: Reset Password (Phương pháp 2 - Legacy)
Có 2 endpoint riêng biệt:
1. `POST /api/auth/verify-forgot-password-otp` - Verify OTP
2. `POST /api/auth/reset-password` - Reset password

**⚠️ Khuyến nghị:** Dùng `reset-password-with-otp` thay vì 2 endpoint riêng để giảm độ phức tạp.

---

## 🔐 Luồng Đổi Mật Khẩu (Change Password)

### 📊 Sơ đồ luồng Change Password

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant JWT Middleware
    participant AccountRepo
    participant PasswordHasher
    participant OTPRepo
    participant EmailService

    Client->>AuthController: POST /api/auth/change-password (with JWT)
    AuthController->>JWT Middleware: Verify JWT token
    JWT Middleware-->>AuthController: AccountId from token
    
    AuthController->>AccountRepo: Get Account by ID
    AuthController->>PasswordHasher: Verify old password
    
    alt Old password incorrect
        AuthController-->>Client: 400 BadRequest
    end
    
    AuthController->>OTPRepo: Check rate limit (<5 attempts)
    AuthController->>OTPRepo: Generate & Save OTP (expires in 1 min)
    AuthController->>EmailService: Send OTP Email
    AuthController-->>Client: Success - OTP sent
    
    Note over Client: User nhập OTP
    
    Client->>AuthController: POST /api/auth/verify-change-password-otp (with JWT)
    AuthController->>JWT Middleware: Verify JWT token
    AuthController->>OTPRepo: Verify OTP
    AuthController->>PasswordHasher: Hash new password
    AuthController->>AccountRepo: Update password
    AuthController->>RefreshTokenRepo: Delete all refresh tokens
    AuthController->>OTPRepo: Delete used OTP
    
    AuthController-->>Client: Success - Password changed
```

### 📝 Chi tiết Change Password

**🔒 Yêu cầu:** Phải có JWT Token hợp lệ trong header `Authorization: Bearer <token>`

#### Bước 1: Yêu cầu OTP
**Endpoint:** `POST /api/auth/change-password`

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**
```json
{
  "oldPassword": "MatKhauCu@123",
  "newPassword": "MatKhauMoi@456"
}
```

**Logic:**
```csharp
1. Lấy accountId từ JWT token (ClaimTypes.NameIdentifier)
2. Tìm Account theo accountId với status="active"
3. Verify oldPassword với password hiện tại → else BadRequest
4. Kiểm tra rate limit (<5 lần trong 2 phút) → else 429
5. Generate OTP 6 số (expires in 1 minute)
6. Hash OTP và lưu (purpose="change_password")
7. Gửi OTP qua email
8. Return success message
```

#### Bước 2: Xác thực OTP và đổi mật khẩu
**Endpoint:** `POST /api/auth/verify-change-password-otp`

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**
```json
{
  "otp": "123456",
  "newPassword": "MatKhauMoi@456"
}
```

**Logic:**
```csharp
1. Lấy accountId từ JWT token
2. Tìm Account theo accountId với status="active"
3. Lấy OTP từ database (purpose="change_password")
4. Kiểm tra OTP hết hạn → return BadRequest
5. Kiểm tra rate limit (>= 5 lần sai) → return 429
6. Verify OTP hash
7. Nếu sai → tăng failed_attempts, return BadRequest
8. Nếu đúng:
   - Hash newPassword bằng BCrypt
   - Update Account.password_hash
   - Xóa TẤT CẢ Refresh Token (bắt buộc login lại)
   - Xóa OTP đã sử dụng
   - Return success
```

---

## 🛡️ Bảo mật

### 1. Password Hashing
- **Thuật toán:** BCrypt với Work Factor = 12
- **Không bao giờ** lưu plain text password
- Mỗi password có unique salt tự động

```csharp
// Hash password
var passwordHash = _passwordHasher.HashPassword("MatKhau@123");
// => $2a$12$randomSalt...hashedPassword

// Verify password
bool isValid = _passwordHasher.VerifyPassword("MatKhau@123", passwordHash);
```

### 2. OTP Security
- **Thời gian sống:** 1 phút (60 giây)
- **Định dạng:** 6 chữ số (100,000 - 999,999)
- **Hash:** BCrypt (không lưu plain text)
- **Rate Limiting:** Tối đa 5 lần thử sai trong 2 phút
- **One-time use:** OTP bị xóa sau khi sử dụng thành công

### 3. JWT Token Security
- **Access Token:**
  - Expires: 15 minutes
  - Claims: account_id, account_type, email
  - Algorithm: HS256
  
- **Refresh Token:**
  - Expires: 30 days
  - Stored in database
  - Single use (deleted after refresh)
  - Revoked when password changes

### 4. Rate Limiting
| Action | Limit | Time Window |
|--------|-------|-------------|
| Register OTP | 5 attempts | 2 minutes |
| Login | No limit | - |
| Forgot Password OTP | 5 attempts | 2 minutes |
| Change Password OTP | 5 attempts | 2 minutes |
| OTP Verification | 5 attempts | Per OTP |

### 5. Account Status
- **pending:** Chưa xác thực email (sau register)
- **active:** Đã xác thực, có thể đăng nhập
- **suspended:** Bị khóa tài khoản (admin action)

---

## 📡 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/register` | ❌ | Đăng ký tài khoản User |
| POST | `/api/auth/register-admin` | ❌ | Đăng ký tài khoản Admin (email đã được cấp quyền) |
| POST | `/api/auth/verify-otp` | ❌ | Xác thực OTP sau đăng ký User |
| POST | `/api/auth/verify-admin-otp` | ❌ | Xác thực OTP sau đăng ký Admin |
| POST | `/api/auth/login` | ❌ | Đăng nhập |
| POST | `/api/auth/logout` | ❌ | Đăng xuất |
| POST | `/api/auth/refresh` | ❌ | Làm mới Access Token |
| POST | `/api/auth/forgot-password` | ❌ | Yêu cầu OTP quên mật khẩu |
| POST | `/api/auth/verify-forgot-password-otp` | ❌ | Verify OTP (legacy) |
| POST | `/api/auth/reset-password` | ❌ | Reset password sau verify (legacy) |
| POST | `/api/auth/reset-password-with-otp` | ❌ | Reset password với OTP (khuyên dùng) |
| POST | `/api/auth/change-password` | ✅ | Yêu cầu OTP đổi mật khẩu |
| POST | `/api/auth/verify-change-password-otp` | ✅ | Xác thực OTP và đổi mật khẩu |

### Request/Response Examples

#### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "nguyenvana",
  "fullName": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "phone": "0123456789",
  "password": "MatKhau@123",
  "dateOfBirth": "1990-01-01",
  "gender": "Nam"
}
```

**Success Response (200):**
```json
{
  "message": "OTP đã được gửi đến email. Vui lòng xác thực trong vòng 1 phút."
}
```

**Error Responses:**
```json
// 400 - Email đã tồn tại
{
  "message": "Email đã tồn tại."
}

// 400 - Validation error
{
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    {
      "propertyName": "Password",
      "errorMessage": "Mật khẩu phải có ít nhất 8 ký tự"
    }
  ]
}

// 429 - Rate limit
{
  "message": "Quá nhiều lần thử. Vui lòng thử lại sau 2 phút."
}
```

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "nguyenvana@example.com",
  "password": "MatKhau@123"
}
```

**Success Response (200):**
```json
{
  "AccessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxMjMiLCJhY2NvdW50X3R5cGUiOiJVc2VyIiwiZW1haWwiOiJuZ3V5ZW52YW5hQGV4YW1wbGUuY29tIiwibmJmIjoxNzM0MTQ0MDAwLCJleHAiOjE3MzQxNDQ5MDAsImlzcyI6IllvdXJBcHAiLCJhdWQiOiJZb3VyQXBwVXNlcnMifQ.signature",
  "RefreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response (401):**
```json
{
  "message": "Thông tin đăng nhập không hợp lệ hoặc tài khoản chưa được kích hoạt."
}
```

#### 3. Change Password
```http
POST /api/auth/change-password
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "oldPassword": "MatKhauCu@123",
  "newPassword": "MatKhauMoi@456"
}
```

**Success Response (200):**
```json
{
  "message": "OTP đã được gửi đến email. Vui lòng xác thực trong vòng 1 phút."
}
```

---

## 🚨 Lỗi Thường Gặp

### 1. "Email đã tồn tại"
**Nguyên nhân:** Email đã được đăng ký trước đó.
**Giải pháp:** Sử dụng email khác hoặc đăng nhập nếu đây là tài khoản của bạn.

### 2. "OTP đã hết hạn hoặc không hợp lệ"
**Nguyên nhân:** 
- OTP đã quá 1 phút
- OTP đã được sử dụng
- OTP không tồn tại

**Giải pháp:** Yêu cầu OTP mới.

### 3. "Quá nhiều lần thử"
**Nguyên nhân:** Nhập sai OTP/password quá 5 lần trong 2 phút.
**Giải pháp:** Đợi 2 phút trước khi thử lại.

### 4. "Token không hợp lệ"
**Nguyên nhân:**
- Access Token đã hết hạn (>15 phút)
- Token bị sửa đổi
- Chưa đăng nhập

**Giải pháp:** 
- Sử dụng Refresh Token để lấy Access Token mới
- Hoặc đăng nhập lại

### 5. "Mật khẩu hiện tại không đúng"
**Nguyên nhân:** Nhập sai mật khẩu cũ khi đổi mật khẩu.
**Giải pháp:** 
- Kiểm tra lại mật khẩu cũ
- Nếu quên, dùng tính năng "Quên mật khẩu"

---

## 🧪 Testing

### Postman Collection
Import file `postman/Authentication.postman_collection.json` để test các API.

### Test Scenarios

#### Scenario 1: Đăng ký thành công
```
1. POST /api/auth/register → 200 OK
2. Check email → Nhận OTP
3. POST /api/auth/verify-otp → 200 OK + tokens
4. Lưu Access Token và Refresh Token
```

#### Scenario 2: Đăng nhập và làm mới token
```
1. POST /api/auth/login → 200 OK + tokens
2. Đợi 16 phút (Access Token hết hạn)
3. Gọi API với Access Token cũ → 401 Unauthorized
4. POST /api/auth/refresh với Refresh Token → 200 OK + tokens mới
5. Gọi API với Access Token mới → 200 OK
```

#### Scenario 3: Đổi mật khẩu
```
1. POST /api/auth/login → 200 OK + tokens
2. POST /api/auth/change-password (với Access Token) → 200 OK
3. Check email → Nhận OTP
4. POST /api/auth/verify-change-password-otp → 200 OK
5. POST /api/auth/login với mật khẩu mới → 200 OK
```

---

## 📝 Code Style & Best Practices

### 1. Logging
Tất cả endpoint quan trọng đều có logging:
```csharp
Console.WriteLine($"[REGISTER] User registered: {account.email?.Value}");
Console.WriteLine($"[LOGIN] Successful login: AccountId={accountId}");
Console.WriteLine($"[CHANGE-PASSWORD] Password changed: AccountId={accountId}");
```

### 2. Error Handling
Luôn trả về thông báo lỗi rõ ràng:
```csharp
// Good ✅
return BadRequest(new { message = "Email đã tồn tại." });

// Bad ❌
return BadRequest(new { message = "Error" });
```

### 3. Security
- Không bao giờ log password, OTP, token
- Không expose stack trace trong production
- Luôn validate input trước khi xử lý

### 4. Database Transactions
Các thao tác quan trọng nên wrap trong transaction:
```csharp
using var transaction = await _context.Database.BeginTransactionAsync();
try
{
    // Multiple database operations
    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

---

## 🔄 Changelog

### Version 1.2.0 (Current)
- ✅ Thêm endpoint `reset-password-with-otp` (1 bước thay vì 2)
- ✅ Cải thiện logging cho troubleshooting
- ✅ Thêm Admin registration flow
- ✅ Thêm Login History tracking

### Version 1.1.0
- ✅ Implement Refresh Token
- ✅ Thêm rate limiting cho OTP
- ✅ Cải thiện error messages

### Version 1.0.0
- ✅ Basic registration & login
- ✅ OTP verification
- ✅ Forgot password
- ✅ Change password

---

## 📞 Liên Hệ & Hỗ Trợ

**Author:** [Tên của bạn]  
**Email:** [Email của bạn]  
**GitHub:** [Link GitHub repo]

**Báo lỗi:** Tạo Issue trên GitHub  
**Đóng góp:** Pull Request luôn được chào đón!

---

## 📚 Tài Liệu Tham Khảo

- [ASP.NET Core Authentication](https://docs.microsoft.com/en-us/aspnet/core/security/authentication/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [BCrypt Documentation](https://github.com/BcryptNet/bcrypt.net)

---

**📅 Last Updated:** December 14, 2025  
**📌 Version:** 1.2.0
