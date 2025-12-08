# WebAdmin React - SNAP67CS Social Media Management

## 🚀 WebAdmin Dashboard được xây dựng bằng React

### Công nghệ sử dụng
- ⚛️ **React 18** - UI Library
- 🎨 **Vite** - Build tool siêu nhanh
- 🛣️ **React Router v6** - Client-side routing
- 📊 **Chart.js + react-chartjs-2** - Biểu đồ thống kê
- 🔌 **Axios** - HTTP client với interceptors
- 🎯 **Context API** - State management

---

## 📦 Cài đặt

### 1. Cài đặt dependencies
```powershell
cd c:\chuyendetinghopdoan\banmoinhatnhat\UngDungMangXaHoi\Presentation\WebApp\WebAdmins
npm install
```

### 2. Chạy development server
```powershell
npm run dev
```

App sẽ chạy tại: **http://localhost:3000**

### 3. Build cho production
```powershell
npm run build
```

Files build sẽ nằm trong folder `dist/`

---

## 🏗️ Cấu trúc Project

```
WebAdmins/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Layout.jsx       # Main layout wrapper
│   │   ├── Sidebar.jsx      # Navigation sidebar
│   │   └── ProtectedRoute.jsx # Auth guard
│   ├── contexts/            # React Context
│   │   └── AuthContext.jsx  # Authentication state
│   ├── pages/               # Page components
│   │   ├── auth/
│   │   │   ├── Login.jsx    # Login page
│   │   │   └── Register.jsx # Register page
│   │   ├── Dashboard.jsx    # Dashboard với charts
│   │   ├── Users.jsx        # User management
│   │   ├── Moderation.jsx   # Content moderation
│   │   ├── Reports.jsx      # Reports management
│   │   ├── Analytics.jsx    # Analytics page
│   │   └── Settings.jsx     # Settings page
│   ├── services/            # API services
│   │   └── api.js           # API client với Axios
│   ├── App.jsx              # Root component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── index_react.html         # HTML template
├── package.json
├── vite.config.js
└── README_REACT.md
```

---

## ✨ Tính năng đã hoàn thành

### ✅ Authentication
- [x] Login với email/phone
- [x] Register Admin với OTP verification
- [x] Protected routes (authentication guard)
- [x] Auto token refresh
- [x] Logout

### ✅ Dashboard
- [x] Thống kê người dùng hoạt động (real API)
- [x] Biểu đồ người dùng mới 30 ngày (Chart.js)
- [x] KPI cards với dữ liệu thực
- [x] Loading states & error handling

### ✅ User Management
- [x] Danh sách người dùng với pagination
- [x] Tìm kiếm & lọc
- [x] Ban/Unban users
- [x] Status badges

### 🔄 Đang phát triển
- [ ] Moderation - Kiểm duyệt nội dung (placeholder)
- [ ] Reports - Xử lý báo cáo (placeholder)
- [ ] Analytics - Biểu đồ chi tiết
- [ ] Settings - Quản lý profile

---

## 🔌 API Integration

### Base URL
```javascript
http://localhost:5297
```

### Các API đã kết nối
1. **Auth API**
   - `POST /api/auth/login` - Đăng nhập
   - `POST /api/auth/register-admin` - Đăng ký admin
   - `POST /api/auth/verify-admin-otp` - Xác thực OTP
   - `POST /api/auth/logout` - Đăng xuất

2. **Admin API**
   - `GET /api/admin/profile` - Lấy thông tin admin

3. **Dashboard API**
   - `GET /api/DashBoard/new-user-stats` - Thống kê người dùng mới
   - `GET /api/DashBoard/activeUser` - Số người đang online

### Mock APIs (sẽ kết nối sau)
- User Management
- Moderation
- Reports

---

## 🎨 Giao diện

### Màu sắc chính
- Primary: `#6366F1` (Indigo)
- Secondary: `#10B981` (Green)
- Danger: `#EF4444` (Red)
- Warning: `#F59E0B` (Orange)

### Responsive
- ✅ Desktop (>1024px)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (<768px)

---

## 🔐 Authentication Flow

1. User nhập email/phone + password
2. Gọi API login → Nhận access token & refresh token
3. Kiểm tra `account_type === 'Admin'`
4. Lưu tokens vào localStorage
5. Lấy profile admin
6. Redirect to Dashboard

**Token Management:**
- Axios interceptor tự động thêm Bearer token
- Auto refresh token khi 401
- Redirect to login khi refresh thất bại

---

## 📝 Scripts

```json
{
  "dev": "vite",              // Chạy dev server
  "build": "vite build",      // Build production
  "preview": "vite preview"   // Preview production build
}
```

---

## 🐛 Debug

### Kiểm tra token
```javascript
localStorage.getItem('accessToken')
localStorage.getItem('refreshToken')
```

### Xem API calls
Mở DevTools → Console để xem logs

### Clear cache
```javascript
localStorage.clear()
```

---

## 📚 Tài liệu

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [React Router](https://reactrouter.com)
- [Chart.js](https://www.chartjs.org)
- [Axios](https://axios-http.com)

---

## 👨‍💻 Development

### Thêm trang mới
1. Tạo component trong `src/pages/`
2. Thêm route trong `src/App.jsx`
3. Thêm nav link trong `src/components/Sidebar.jsx`

### Thêm API mới
1. Thêm function trong `src/services/api.js`
2. Export và import vào component cần dùng
3. Sử dụng async/await với try-catch

---

## ⚠️ Lưu ý

- File `index_react.html` là entry point (không phải `index.html` cũ)
- Backend API phải chạy trước tại `http://localhost:5297`
- Chỉ tài khoản Admin mới đăng nhập được
- Mock data đang dùng cho Users/Moderation/Reports

---

## 🚀 Deployment

### Build
```powershell
npm run build
```

### Deploy
Upload folder `dist/` lên web server hoặc:
- Vercel
- Netlify
- GitHub Pages
- Azure Static Web Apps

---

**Made with ❤️ using React**
