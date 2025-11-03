# WebUser - Ứng dụng mạng xã hội

## Cấu trúc thư mục

```
WebUsers/
├── js/
│   ├── main.js                 # File chính để load tất cả modules
│   ├── services/
│   │   └── AuthService.js      # Xử lý logic authentication
│   ├── utils/
│   │   ├── DateUtils.js        # Xử lý ngày tháng
│   │   ├── ValidationUtils.js  # Xử lý validation
│   │   └── UIUtils.js          # Xử lý UI và DOM
│   └── pages/
│       ├── LoginPage.js        # Logic cho trang login
│       ├── SignupPage.js       # Logic cho trang đăng ký
│       ├── VerifyOtpPage.js    # Logic cho trang verify OTP
│       ├── ForgotPasswordPage.js # Logic cho trang quên mật khẩu
│       └── HomePage.js         # Logic cho trang chủ
├── Styles/
│   ├── auth.css               # CSS cho authentication
│   ├── components.css         # CSS cho components
│   ├── instagram.css         # CSS cho Instagram-style
│   └── style.css             # CSS chung
├── Context/
│   └── UserContext.js        # Context cho user state
├── API/
│   └── Api.js                # API calls
├── Home/
│   └── index.html            # Trang chủ
├── login.html                # Trang đăng nhập
├── signup.html               # Trang đăng ký
├── verify-otp.html           # Trang xác thực OTP
├── forgot-password.html      # Trang quên mật khẩu
└── index.html                # Trang chính
```

## Cách sử dụng

### 1. Load modules
File `main.js` sẽ tự động load các modules cần thiết theo thứ tự:
- Utils (DateUtils, ValidationUtils, UIUtils)
- Services (AuthService)
- Page-specific scripts

### 2. Page classes
Mỗi trang có một class riêng để xử lý logic:
- `LoginPage` - Xử lý đăng nhập
- `SignupPage` - Xử lý đăng ký
- `VerifyOtpPage` - Xử lý xác thực OTP
- `ForgotPasswordPage` - Xử lý quên mật khẩu
- `HomePage` - Xử lý trang chủ

### 3. Services
- `AuthService` - Xử lý tất cả logic authentication
- Tự động lưu/load user info từ localStorage
- Tự động redirect khi cần thiết

### 4. Utils
- `ValidationUtils` - Validation form data
- `DateUtils` - Xử lý ngày tháng
- `UIUtils` - Xử lý UI và DOM

## Tính năng

### Authentication
- ✅ Đăng nhập với email/phone
- ✅ Đăng ký tài khoản mới
- ✅ Xác thực OTP
- ✅ Quên mật khẩu
- ✅ Đặt lại mật khẩu
- ✅ Auto-login với localStorage

### UI/UX
- ✅ Responsive design
- ✅ Real-time validation
- ✅ Loading states
- ✅ Error handling
- ✅ Success messages
- ✅ Auto-focus inputs

### Validation
- ✅ Email validation
- ✅ Phone validation
- ✅ Password strength
- ✅ Username validation
- ✅ OTP validation
- ✅ Form validation

## API Integration

Tất cả API calls được xử lý thông qua `AuthService` và `UserContext`:
- Login/Register
- Verify OTP
- Forgot Password
- Reset Password
- Change Password

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Development

### Thêm trang mới:
1. Tạo file HTML trong root
2. Tạo file JS trong `js/pages/`
3. Thêm mapping trong `main.js`
4. Include `main.js` trong HTML

### Thêm tính năng mới:
1. Tạo service trong `js/services/`
2. Tạo util trong `js/utils/` nếu cần
3. Sử dụng trong page classes

## Notes

- Tất cả form đều có validation real-time
- Loading states được xử lý tự động
- Error handling được centralize
- Responsive design cho mobile
- Accessibility friendly
