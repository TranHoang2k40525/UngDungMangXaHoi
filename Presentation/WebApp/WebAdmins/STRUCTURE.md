# 📂 Cấu trúc Thư mục WebAdmin React

## 🗂️ Tổ chức theo Chức năng

```
src/
├── pages/
│   ├── auth/                    # 🔐 Xác thực
│   │   ├── Login.jsx           # Đăng nhập
│   │   ├── Register.jsx        # Đăng ký Admin
│   │   └── Auth.css            # Styles chung cho auth
│   │
│   ├── home/                    # 🏠 Trang chủ
│   │   ├── Dashboard.jsx       # Dashboard chính với biểu đồ
│   │   └── Dashboard.css       # Styles cho dashboard
│   │
│   ├── users/                   # 👥 Quản lý người dùng
│   │   ├── Users.jsx           # Danh sách & quản lý users
│   │   └── Users.css           # Styles cho users
│   │
│   ├── moderation/             # 🔍 Kiểm duyệt nội dung
│   │   ├── Moderation.jsx      # Kiểm duyệt bài đăng, comments
│   │   └── Moderation.css      # Styles cho moderation
│   │
│   ├── reports/                # ⚠️ Báo cáo vi phạm
│   │   ├── Reports.jsx         # Xử lý báo cáo
│   │   └── Reports.css         # Styles cho reports
│   │
│   ├── analytics/              # 📊 Thống kê & Phân tích
│   │   └── Analytics.jsx       # Trang analytics (placeholder)
│   │
│   └── settings/               # ⚙️ Cài đặt
│       ├── Settings.jsx        # Cài đặt profile, đổi mật khẩu
│       └── Settings.css        # Styles cho settings
│
├── components/                  # 🧩 Components tái sử dụng
│   ├── Layout.jsx              # Layout wrapper
│   ├── Layout.css              
│   ├── Sidebar.jsx             # Navigation sidebar
│   ├── Sidebar.css             
│   └── ProtectedRoute.jsx      # Auth guard
│
├── contexts/                    # 📦 React Context
│   └── AuthContext.jsx         # Authentication state
│
├── services/                    # 🔌 API Services
│   └── api.js                  # API client với Axios
│
├── App.jsx                      # Root component
├── main.jsx                     # Entry point
└── index.css                    # Global styles
```

---

## 📝 Chi tiết từng Chức năng

### 🔐 **auth/** - Xác thực
- `Login.jsx` - Form đăng nhập với email/phone
- `Register.jsx` - Đăng ký Admin + OTP verification
- Kết nối API: `/api/auth/login`, `/api/auth/register-admin`

### 🏠 **home/** - Dashboard
- `Dashboard.jsx` - Trang chủ với KPI cards và biểu đồ
- Hiển thị: Người dùng hoạt động, người mới, biểu đồ 30 ngày
- Kết nối API: `/api/DashBoard/new-user-stats`, `/api/DashBoard/activeUser`

### 👥 **users/** - Quản lý Người dùng
- `Users.jsx` - Danh sách người dùng với tìm kiếm, lọc, pagination
- Chức năng: Ban/Unban users
- API: Mock data (chờ backend API)

### 🔍 **moderation/** - Kiểm duyệt
- `Moderation.jsx` - Kiểm duyệt bài đăng, bình luận, stories
- Chức năng: Duyệt, Từ chối, Xóa nội dung
- API: Mock data (chờ backend API)

### ⚠️ **reports/** - Báo cáo Vi phạm
- `Reports.jsx` - Xử lý báo cáo từ người dùng
- Chức năng: Xem, Xử lý, Từ chối báo cáo
- API: Mock data (chờ backend API)

### 📊 **analytics/** - Thống kê
- `Analytics.jsx` - Trang phân tích chi tiết (đang phát triển)

### ⚙️ **settings/** - Cài đặt
- `Settings.jsx` - Quản lý profile, đổi mật khẩu, cài đặt hệ thống
- Tab: Profile, Password, System
- API: `/api/admin/update-profile`, `/api/auth/change-password`

---

## 🔧 Import Paths

Khi import từ các page components:

```javascript
// Từ App.jsx
import Dashboard from './pages/home/Dashboard'
import Users from './pages/users/Users'
import Moderation from './pages/moderation/Moderation'

// Từ bên trong page component
import { dashboardAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
```

---

## 🚀 So sánh với Cấu trúc HTML Cũ

| HTML Cũ | React Mới |
|---------|-----------|
| `pages/auth/login.html` | `src/pages/auth/Login.jsx` |
| `pages/home/home.html` | `src/pages/home/Dashboard.jsx` |
| `pages/users/users.html` | `src/pages/users/Users.jsx` |
| `pages/moderation/moderation.html` | `src/pages/moderation/Moderation.jsx` |
| `pages/reports/reports.html` | `src/pages/reports/Reports.jsx` |
| `pages/settings/settings.html` | `src/pages/settings/Settings.jsx` |

---

## 📌 Lưu ý

- Mỗi chức năng có folder riêng, dễ tìm và maintain
- Mỗi folder chứa component `.jsx` và styles `.css` tương ứng
- Cấu trúc giống HTML cũ, dễ migration
- Import path sử dụng relative path (`../../`)

---

**Cập nhật:** 2025-12-05
