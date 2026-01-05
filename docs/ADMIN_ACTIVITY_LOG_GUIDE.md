# 📜 Hướng Dẫn Chi Tiết - Nhật Ký Hoạt Động Admin

## 🎯 Tổng Quan

Tính năng **Nhật ký Hoạt động Admin** giúp theo dõi và ghi lại toàn bộ các hành động của quản trị viên trong hệ thống SNAP67CS. Đây là công cụ quan trọng để:

-   **Giám sát hoạt động**: Theo dõi mọi hành động của admin
-   **Kiểm toán hệ thống**: Xem lại lịch sử các thay đổi quan trọng
-   **Phát hiện bất thường**: Nhận diện các hoạt động nghi ngờ
-   **Báo cáo và tuân thủ**: Xuất báo cáo cho mục đích kiểm tra
-   **Truy vết vấn đề**: Tìm hiểu ai đã thực hiện hành động gì và khi nào

---

## 🎨 Giao Diện Tính Năng

### 1. **Dashboard Thống Kê**

Hiển thị 4 chỉ số chính:

```
┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│  📊 Tổng hành động  │  👥 Admin hoạt động │    🕒 24 giờ qua   │  📈 Trung bình/ngày │
│        856          │          4          │        127         │         122         │
└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘
```

### 2. **Bộ Lọc Theo Admin**

Cho phép lọc nhanh theo từng admin cụ thể:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  👥 Lọc theo Admin                                                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [Tất cả]  [Nguyễn Văn Admin (234)]  [Trần Thị Moderator (189)]  ...           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3. **Thanh Công Cụ Tìm Kiếm & Lọc**

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [🔍 Tìm kiếm...] [Tất cả loại ▼] [7 ngày qua ▼] [🔄 Xóa bộ lọc]               │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4. **Danh Sách Nhật Ký**

Mỗi mục nhật ký hiển thị:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 👤  Nguyễn Văn Admin  Cấm người dùng  @user123                         🟢      │
│     Chi tiết về hành động cấm người dùng. Người dùng đã vi phạm quy định...    │
│     📧 admin1@snap67cs.com  🌐 192.168.1.100  🕒 5 phút trước  [Thành công]   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Các Tính Năng Chi Tiết

### ✅ 1. Tìm Kiếm Đa Tiêu Chí

Tìm kiếm theo:

-   **Hành động**: "Cấm người dùng", "Xóa bài đăng"
-   **Tên admin**: "Nguyễn Văn Admin"
-   **Email admin**: "admin1@snap67cs.com"
-   **Đối tượng**: "@user123", "Bài đăng #456"

**Ví dụ:**

```javascript
// Tìm tất cả hoạt động liên quan đến "cấm"
searchTerm = "cấm"

// Kết quả:
- Cấm người dùng @user123
- Gỡ cấm người dùng @user456
```

### ✅ 2. Lọc Theo Loại Hành Động

**6 loại hành động được hỗ trợ:**

| Icon | Loại             | Mô tả                                   |
| ---- | ---------------- | --------------------------------------- |
| 👤   | **Người dùng**   | Cấm/gỡ cấm, cảnh cáo, xóa tài khoản     |
| 📝   | **Bài đăng**     | Xóa, phê duyệt, từ chối, ẩn bài đăng    |
| 🏢   | **Doanh nghiệp** | Phê duyệt/từ chối xác thực doanh nghiệp |
| 💬   | **Bình luận**    | Xóa, ẩn, phê duyệt bình luận            |
| ⚠️   | **Báo cáo**      | Xử lý, từ chối, chuyển tiếp báo cáo     |
| ⚙️   | **Hệ thống**     | Cập nhật cài đặt, thay đổi quyền        |

### ✅ 3. Lọc Theo Thời Gian

**4 khoảng thời gian:**

-   **24 giờ qua**: Hoạt động gần nhất
-   **7 ngày qua**: Tuần vừa qua
-   **30 ngày qua**: Tháng vừa qua
-   **90 ngày qua**: 3 tháng gần nhất

### ✅ 4. Lọc Theo Admin Cụ Thể

Click vào chip admin để xem chỉ hoạt động của admin đó:

```javascript
// Ví dụ: Chọn "Nguyễn Văn Admin"
selectedAdmin = "admin1@snap67cs.com";

// Hiển thị chỉ 234 hoạt động của admin này
```

### ✅ 5. Trạng Thái Hành Động

**4 trạng thái được theo dõi:**

| Màu           | Trạng thái     | Ý nghĩa                  |
| ------------- | -------------- | ------------------------ |
| 🟢 Xanh       | **Thành công** | Hành động hoàn thành tốt |
| 🟡 Vàng       | **Cảnh báo**   | Có điểm cần lưu ý        |
| 🔴 Đỏ         | **Lỗi**        | Hành động thất bại       |
| 🔵 Xanh dương | **Thông tin**  | Hành động thông tin      |

### ✅ 6. Xuất Báo Cáo

**3 định dạng file:**

#### 📊 CSV (Excel)

-   Phù hợp để phân tích trong Excel
-   Dễ dàng tạo biểu đồ, pivot table
-   File nhẹ, nhanh

#### 📄 JSON

-   Định dạng có cấu trúc
-   Phù hợp cho lập trình viên
-   Dễ import vào hệ thống khác

#### 📕 PDF

-   Báo cáo chuyên nghiệp
-   Có định dạng, dễ đọc
-   Phù hợp để lưu trữ, chia sẻ

**Cách xuất báo cáo:**

1. Click nút "📥 Xuất báo cáo"
2. Chọn định dạng file
3. File tự động tải về

---

## 📊 Dữ Liệu Được Ghi Lại

Mỗi nhật ký bao gồm:

```json
{
    "id": 1,
    "adminName": "Nguyễn Văn Admin",
    "adminEmail": "admin1@snap67cs.com",
    "action": "Cấm người dùng",
    "entityType": "user",
    "entityName": "@user123",
    "details": "Người dùng đã vi phạm quy định cộng đồng nhiều lần.",
    "ipAddress": "192.168.1.100",
    "timestamp": "2026-01-05T10:30:00Z",
    "status": "success"
}
```

### Giải Thích Các Trường:

| Trường         | Mô tả               | Ví dụ                         |
| -------------- | ------------------- | ----------------------------- |
| **adminName**  | Tên admin thực hiện | "Nguyễn Văn Admin"            |
| **adminEmail** | Email admin         | "admin1@snap67cs.com"         |
| **action**     | Hành động cụ thể    | "Cấm người dùng"              |
| **entityType** | Loại đối tượng      | "user", "post", "business"    |
| **entityName** | Tên/ID đối tượng    | "@user123", "Bài đăng #456"   |
| **details**    | Mô tả chi tiết      | Lý do, thông tin thêm         |
| **ipAddress**  | Địa chỉ IP          | "192.168.1.100"               |
| **timestamp**  | Thời gian           | ISO 8601 format               |
| **status**     | Trạng thái          | "success", "warning", "error" |

---

## 🔌 API Endpoints

### 1. Lấy Danh Sách Nhật Ký

```http
GET /api/admin/activity-logs?page=1&pageSize=20&actionType=user&days=7&search=cấm
```

**Parameters:**

-   `page`: Trang hiện tại (mặc định: 1)
-   `pageSize`: Số bản ghi/trang (mặc định: 20)
-   `actionType`: Loại hành động (all, user, post, business, comment, report, system)
-   `adminEmail`: Email admin cụ thể
-   `days`: Số ngày lọc (1, 7, 30, 90)
-   `search`: Từ khóa tìm kiếm

**Response:**

```json
{
  "logs": [
    {
      "id": 1,
      "adminName": "Nguyễn Văn Admin",
      "action": "Cấm người dùng",
      ...
    }
  ],
  "total": 856,
  "page": 1,
  "pageSize": 20,
  "totalPages": 43
}
```

### 2. Lấy Thống Kê

```http
GET /api/admin/activity-logs/stats?days=7
```

**Response:**

```json
{
    "totalActions": 856,
    "activeAdmins": 4,
    "last24Hours": 127,
    "averagePerDay": 122,
    "topActions": [
        {
            "action": "Xử lý báo cáo vi phạm",
            "count": 234
        }
    ]
}
```

### 3. Lấy Danh Sách Admin Hoạt Động

```http
GET /api/admin/activity-logs/active-admins?days=7
```

**Response:**

```json
{
    "admins": [
        {
            "email": "admin1@snap67cs.com",
            "name": "Nguyễn Văn Admin",
            "actionCount": 234
        }
    ]
}
```

### 4. Xuất Báo Cáo

```http
GET /api/admin/activity-logs/export?startDate=2026-01-01&endDate=2026-01-05&format=csv
```

**Parameters:**

-   `startDate`: Ngày bắt đầu (YYYY-MM-DD)
-   `endDate`: Ngày kết thúc (YYYY-MM-DD)
-   `format`: Định dạng file (csv, json, pdf)

**Response:**

-   File download (blob)

---

## 💻 Code Implementation

### Frontend Component

File: `src/pages/logs/AdminActionsLog.js`

**Các state chính:**

```javascript
const [logs, setLogs] = useState([]); // Danh sách nhật ký
const [stats, setStats] = useState(null); // Thống kê
const [activeAdmins, setActiveAdmins] = useState([]); // Admin hoạt động
const [loading, setLoading] = useState(true); // Trạng thái loading
const [filter, setFilter] = useState("all"); // Lọc theo loại
const [dateFilter, setDateFilter] = useState("7"); // Lọc theo thời gian
const [searchTerm, setSearchTerm] = useState(""); // Tìm kiếm
const [selectedAdmin, setSelectedAdmin] = useState(""); // Admin được chọn
const [page, setPage] = useState(1); // Trang hiện tại
const [totalPages, setTotalPages] = useState(1); // Tổng số trang
```

**Load dữ liệu:**

```javascript
const loadLogs = async () => {
    try {
        setLoading(true);
        const result = await activityLogsAPI.getActivityLogs(
            page,
            20,
            filter,
            selectedAdmin,
            dateFilter,
            searchTerm
        );

        setLogs(result.logs || []);
        setTotalPages(result.totalPages || 1);
    } catch (error) {
        console.error("Error loading logs:", error);
    } finally {
        setLoading(false);
    }
};
```

**Lọc dữ liệu:**

```javascript
const filteredLogs = logs.filter((log) => {
    // Filter theo loại action
    if (filter !== "all" && log.entityType !== filter) return false;

    // Filter theo admin
    if (selectedAdmin && log.adminEmail !== selectedAdmin) return false;

    // Filter theo search term
    if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchAction = log.action.toLowerCase().includes(search);
        const matchAdmin = log.adminName.toLowerCase().includes(search);
        const matchEmail = log.adminEmail.toLowerCase().includes(search);
        const matchEntity = log.entityName.toLowerCase().includes(search);

        if (!matchAction && !matchAdmin && !matchEmail && !matchEntity) {
            return false;
        }
    }

    return true;
});
```

### API Service

File: `src/services/api.js`

```javascript
export const activityLogsAPI = {
    async getActivityLogs(
        page,
        pageSize,
        actionType,
        adminEmail,
        dateFilter,
        searchTerm
    ) {
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
        });

        if (actionType && actionType !== "all") {
            params.append("actionType", actionType);
        }

        if (adminEmail) {
            params.append("adminEmail", adminEmail);
        }

        if (dateFilter) {
            params.append("days", dateFilter);
        }

        if (searchTerm) {
            params.append("search", searchTerm);
        }

        return apiClient.get(`/api/admin/activity-logs?${params.toString()}`);
    },

    async getActivityStats(days) {
        return apiClient.get(`/api/admin/activity-logs/stats?days=${days}`);
    },

    async getActiveAdmins(days) {
        return apiClient.get(
            `/api/admin/activity-logs/active-admins?days=${days}`
        );
    },

    async exportActivityLogs(startDate, endDate, format) {
        const params = new URLSearchParams({
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            format,
        });

        return apiClient.get(
            `/api/admin/activity-logs/export?${params.toString()}`,
            {
                responseType: "blob",
            }
        );
    },
};
```

---

## 🎯 Use Cases (Trường Hợp Sử Dụng)

### 1. **Kiểm tra ai đã cấm một người dùng**

**Bước thực hiện:**

1. Nhập `@username` vào ô tìm kiếm
2. Chọn filter "👤 Người dùng"
3. Xem kết quả với chi tiết: admin nào, khi nào, lý do gì

### 2. **Xem hoạt động của một admin trong tuần**

**Bước thực hiện:**

1. Click vào chip admin tương ứng
2. Chọn "7 ngày qua"
3. Xem tất cả 234 hoạt động của admin đó

### 3. **Tìm tất cả hoạt động liên quan đến doanh nghiệp**

**Bước thực hiện:**

1. Chọn filter "🏢 Doanh nghiệp"
2. Xem các hoạt động: phê duyệt, từ chối, thu hồi xác thực

### 4. **Xuất báo cáo tháng cho ban quản lý**

**Bước thực hiện:**

1. Chọn "30 ngày qua"
2. Click "📥 Xuất báo cáo"
3. Chọn định dạng PDF
4. Gửi file PDF cho ban quản lý

### 5. **Phát hiện hoạt động bất thường**

**Bước thực hiện:**

1. Xem thống kê "24 giờ qua"
2. Nếu số lượng bất thường cao → điều tra
3. Lọc theo admin để xem chi tiết
4. Kiểm tra IP address để phát hiện truy cập lạ

---

## 🔐 Bảo Mật & Quyền Hạn

### Ai Có Thể Truy Cập?

✅ **Super Admin**: Xem tất cả nhật ký
✅ **Admin Manager**: Xem nhật ký của team
⚠️ **Moderator**: Chỉ xem nhật ký của chính mình
❌ **User thường**: Không có quyền truy cập

### Dữ Liệu Được Bảo Vệ

-   **Authentication**: Yêu cầu đăng nhập với token
-   **Authorization**: Kiểm tra quyền admin
-   **IP Logging**: Ghi lại IP để phát hiện truy cập bất thường
-   **Rate Limiting**: Giới hạn số lần truy vấn
-   **Data Encryption**: Mã hóa dữ liệu nhạy cảm

---

## 📱 Responsive Design

Giao diện tự động điều chỉnh theo kích thước màn hình:

### Desktop (> 1024px)

-   Hiển thị 4 cột stats
-   Filters nằm ngang
-   Logs hiển thị đầy đủ thông tin

### Tablet (768px - 1024px)

-   2 cột stats
-   Filters vẫn nằm ngang
-   Logs thu gọn một chút

### Mobile (< 768px)

-   1 cột stats
-   Filters xếp dọc
-   Logs hiển thị compact
-   Admin chips full width

---

## 🐛 Troubleshooting

### Vấn Đề: Không Load Được Dữ Liệu

**Nguyên nhân:**

-   Backend API chưa sẵn sàng
-   Token hết hạn
-   Network error

**Giải pháp:**

```javascript
// Toggle sang Mock Data để test
setUseMockData(true);

// Hoặc kiểm tra console log
console.error("Error loading logs:", error);
```

### Vấn Đề: Tìm Kiếm Không Hoạt Động

**Kiểm tra:**

-   Filter có đúng không?
-   Từ khóa có chính xác?
-   Có dữ liệu trong khoảng thời gian không?

**Debug:**

```javascript
console.log("Search term:", searchTerm);
console.log("Filtered logs:", filteredLogs);
console.log("Original logs:", logs);
```

### Vấn Đề: Xuất Báo Cáo Lỗi

**Kiểm tra:**

-   Backend có hỗ trợ format không?
-   Có dữ liệu để xuất không?
-   Browser có block download không?

---

## 📈 Tối Ưu Hiệu Năng

### 1. **Pagination**

-   Load 20 bản ghi/trang
-   Tránh load toàn bộ data cùng lúc

### 2. **Debounce Search**

```javascript
// TODO: Thêm debounce cho search input
const debouncedSearch = useDebounce(searchTerm, 500);
```

### 3. **Cache Data**

```javascript
// TODO: Cache stats và active admins
const cachedStats = useMemo(() => stats, [dateFilter]);
```

### 4. **Lazy Load**

```javascript
// TODO: Infinite scroll cho mobile
const { hasMore, loadMore } = useInfiniteScroll();
```

---

## 🎨 Customization

### Thay Đổi Màu Sắc Trạng Thái

File: `AdminActionsLog.js`

```javascript
const getStatusColor = (status) => {
    const colors = {
        success: "#10B981", // Xanh lá
        warning: "#F59E0B", // Vàng
        error: "#EF4444", // Đỏ
        info: "#3B82F6", // Xanh dương
    };
    return colors[status] || "#6B7280";
};
```

### Thêm Loại Hành Động Mới

```javascript
const actionTypes = {
  user: [...],
  post: [...],
  business: [...],
  // Thêm loại mới
  payment: [
    'Xử lý thanh toán',
    'Hoàn tiền',
    'Xác nhận giao dịch'
  ]
};

// Thêm icon
const getActionIcon = (entityType) => {
  const icons = {
    // ...existing icons
    payment: '💳'
  };
  return icons[entityType] || '📋';
};
```

---

## ✅ Checklist Hoàn Thành

-   [x] Giao diện dashboard với stats
-   [x] Bộ lọc theo loại hành động
-   [x] Tìm kiếm đa tiêu chí
-   [x] Lọc theo admin cụ thể
-   [x] Lọc theo khoảng thời gian
-   [x] Pagination
-   [x] Xuất báo cáo (CSV, JSON, PDF)
-   [x] Responsive design
-   [x] Mock data để test
-   [x] API service hoàn chỉnh
-   [ ] Backend API integration
-   [ ] Unit tests
-   [ ] E2E tests
-   [ ] Performance optimization

---

## 📚 Tài Liệu Tham Khảo

### Files Liên Quan

1. **Frontend Component**

    - `src/pages/logs/AdminActionsLog.js`
    - `src/pages/logs/AdminActionsLog.css`

2. **API Service**

    - `src/services/api.js` (activityLogsAPI)

3. **Backend Controllers** (Chưa implement)
    - `Controllers/AdminActivityLogsController.cs`
    - `Services/ActivityLogService.cs`
    - `Repositories/ActivityLogRepository.cs`

### Best Practices

1. **Luôn ghi log cho các hành động quan trọng**

    - Cấm/gỡ cấm user
    - Xóa nội dung
    - Thay đổi quyền hạn
    - Cập nhật cài đặt hệ thống

2. **Ghi đủ thông tin**

    - Admin thực hiện
    - Thời gian chính xác
    - IP address
    - Chi tiết hành động
    - Kết quả (success/error)

3. **Bảo vệ dữ liệu nhạy cảm**

    - Không ghi password
    - Hash email nếu cần
    - Mã hóa thông tin cá nhân

4. **Tối ưu truy vấn**
    - Index trên timestamp, adminId
    - Partition theo tháng/năm
    - Archive data cũ

---

## 🎉 Kết Luận

Tính năng **Nhật ký Hoạt động Admin** là một công cụ quan trọng để:

✅ **Minh bạch**: Mọi hành động đều được ghi lại
✅ **Trách nhiệm**: Admin chịu trách nhiệm cho hành động của mình
✅ **Giám sát**: Phát hiện và ngăn chặn hành vi sai trái
✅ **Tuân thủ**: Đáp ứng yêu cầu kiểm toán và pháp lý

**Next Steps:**

1. Integrate với Backend API thật
2. Thêm Real-time updates (SignalR/WebSocket)
3. Cải thiện performance với caching
4. Thêm Advanced Analytics
5. Mobile App support

---

**Ngày cập nhật**: 5/1/2026
**Phiên bản**: 1.0.0
**Tác giả**: SNAP67CS Development Team
