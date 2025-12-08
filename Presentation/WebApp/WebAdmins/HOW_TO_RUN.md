# 🚀 HƯỚNG DẪN CHẠY FRONTEND - WebAdmin React

## 📋 Yêu cầu
- Node.js v18+ 
- npm v9+
- Backend API chạy tại `http://localhost:5297`

---

## ⚡ LỆNH CHẠY FRONTEND

### 1️⃣ Cài đặt lần đầu
```powershell
cd c:\chuyendetinghopdoan\banmoinhatnhat\UngDungMangXaHoi\Presentation\WebApp\WebAdmins
npm install
```

### 2️⃣ Chạy Development Server
```powershell
cd c:\chuyendetinghopdoan\banmoinhatnhat\UngDungMangXaHoi\Presentation\WebApp\WebAdmins
npm run dev
```

**App sẽ chạy tại:** http://localhost:3000

### 3️⃣ Build Production
```powershell
npm run build
```

Files build sẽ nằm trong folder `dist/`

### 4️⃣ Preview Production Build
```powershell
npm run preview
```

---

## 📁 Cấu trúc Dự án

```
WebAdmins/
├── src/                        # Source code React
│   ├── pages/                 # Các trang chức năng
│   │   ├── auth/             # Đăng nhập, đăng ký
│   │   ├── home/             # Dashboard
│   │   ├── users/            # Quản lý người dùng
│   │   ├── moderation/       # Kiểm duyệt nội dung
│   │   ├── reports/          # Báo cáo vi phạm
│   │   ├── analytics/        # Thống kê
│   │   └── settings/         # Cài đặt
│   ├── components/           # Components tái sử dụng
│   ├── contexts/             # React Context (Auth)
│   ├── services/             # API services
│   ├── App.jsx               # Root component
│   └── main.jsx              # Entry point
├── public/                    # Static files
├── index.html                 # HTML template
├── package.json               # Dependencies
├── vite.config.js             # Vite config
└── README_REACT.md            # Chi tiết đầy đủ
```

---

## 🔥 Hot Reload
Khi chạy `npm run dev`, mọi thay đổi code sẽ **tự động reload** trên browser!

---

## 🔌 Kết nối Backend

Backend API phải chạy trước tại: **http://localhost:5297**

Nếu backend chạy ở port khác, sửa trong:
```javascript
// src/services/api.js
const API_BASE_URL = 'http://localhost:5297'; // <- Sửa ở đây
```

---

## 🛠️ Các Scripts có sẵn

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy development server (localhost:3000) |
| `npm run build` | Build production vào folder `dist/` |
| `npm run preview` | Preview production build |
| `npm install` | Cài đặt dependencies |

---

## 📊 Tính năng đã có

### ✅ Hoàn chỉnh
- ✅ Login/Register với OTP
- ✅ Dashboard với biểu đồ Chart.js
- ✅ Quản lý Users (search, filter, ban/unban)
- ✅ Kiểm duyệt nội dung (approve, reject, delete)
- ✅ Báo cáo vi phạm (view, resolve, reject)
- ✅ Cài đặt (profile, đổi mật khẩu)
- ✅ Protected routes với auto token refresh

### 🔄 Đang dùng Mock Data
- Users Management
- Moderation
- Reports

*(Sẽ kết nối API thật khi backend cung cấp)*

---

## 🐛 Troubleshooting

### Lỗi: Port 3000 đã được sử dụng
```powershell
# Đổi port trong vite.config.js
server: {
  port: 3001  # <- Đổi port khác
}
```

### Lỗi: Cannot connect to API
- Kiểm tra backend đã chạy chưa (localhost:5297)
- Kiểm tra CORS đã bật trên backend chưa

### Xóa cache và node_modules
```powershell
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install
```

---

## 📚 Tài liệu thêm

- Chi tiết đầy đủ: `README_REACT.md`
- Cấu trúc dự án: `STRUCTURE.md`
- React Docs: https://react.dev
- Vite Docs: https://vitejs.dev

---

## 🎯 Tóm tắt - Lệnh quan trọng nhất

```powershell
# Vào thư mục WebAdmins
cd c:\chuyendetinghopdoan\banmoinhatnhat\UngDungMangXaHoi\Presentation\WebApp\WebAdmins

# Chạy frontend
npm run dev
```

**→ Mở browser: http://localhost:3000**

---

✨ **React WebAdmin đã sẵn sàng!** ✨
