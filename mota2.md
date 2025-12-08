📊 TỔNG QUAN CHỨC NĂNG WEB ADMIN
✅ ĐÃ CÓ - HOÀN CHỈNH
1. QUẢN LÝ TẬI KHOẢN ADMIN (AdminController)
•	✅ GET /api/admin/profile - Xem profile admin
•	✅ PUT /api/admin/update-profile - Cập nhật thông tin cá nhân
•	✅ POST /api/admin/change-password - Đổi mật khẩu (có OTP qua email)
•	✅ POST /api/admin/verify-change-password-otp - Xác thực OTP
Thông tin profile admin bao gồm:
•	FullName, Email, Phone, Bio, Avatar
•	Address, Hometown, Job, Website
•	AdminLevel (cấp bậc admin)
•	DateOfBirth, Gender, IsPrivate
________________________________________
2. THỐNG KÊ DASHBOARD (DashBoardController) - CỰC KỲ ĐẦY ĐỦ ⭐
A. Endpoint Tổng Hợp (Summary)
•	✅ GET /api/dashboard/summary - Lấy TẤT CẢ dữ liệu dashboard một lần
o	Params: startDate, endDate, chartGroupBy (Day/Week/Month/Year)
o	Trả về: Tổng hợp 6 phần thống kê
B. Thống Kê Người Dùng
•	✅ GET /api/dashboard/new-user-stats - Người dùng mới đăng ký theo thời gian
•	✅ GET /api/dashboard/activeUser - Số lượng người dùng hoạt động
C. Biểu Đồ Tăng Trưởng Business
•	✅ GET /api/dashboard/business-growth-chart
o	Params: startDate, endDate, group (Day/Week/Month/Year)
o	Trả về:
	Labels[] - Nhãn thời gian (06/12, Tuần 01/12, 12/2025...)
	Counts[] - Số lượng Business đăng ký
	TotalBusinessAccounts - Tổng số tài khoản Business
D. Biểu Đồ Doanh Thu
•	✅ GET /api/dashboard/revenue-chart
o	Nguồn dữ liệu: Bảng BusinessPayment (số tiền thu từ người nâng cấp Business)
o	Trả về:
	Labels[] - Nhãn thời gian
	Revenues[] - Doanh thu từng kỳ
	TotalRevenue - Tổng doanh thu
E. Biểu Đồ Tăng Trưởng Bài Đăng
•	✅ GET /api/dashboard/post-growth-chart
o	Trả về:
	Labels[] - Thời gian
	Counts[] - Số bài đăng
	TotalPosts - Tổng số bài đăng
F. Top Từ Khóa Tìm Kiếm
•	✅ GET /api/dashboard/keyword-top
o	Params: topN (số lượng), startDate, endDate
o	Trả về: ⭐ DANH SÁCH ĐẦY ĐỦ
{
"keywords": [
{
"keyword": "iphone 15",
"searchCount": 1520,
"tyle": 15.2
}
],
"totalSearches": 10000
}
G. Top Bài Đăng Được Tương Tác Nhiều Nhất
•	✅ GET /api/dashboard/posts-top
o	Params: topN (mặc định 10), startDate, endDate
o	Trả về: ⭐ THÔNG TIN CỰC KỲ ĐẦY ĐỦ
{
"posts": [
{
"postId": 123,
"caption": "Nội dung bài viết...",
"createdAt": "2025-12-01T10:00:00Z",
"author": {
"userId": 45,
"userName": "user123",
"fullName": "Nguyễn Văn A",
"avatarUrl": "https://...",
"accountType": "Business"
},
"media": [
{
"mediaUrl": "https://...",
"mediaType": "Image",
"mediaOrder": 0
}
],
"engagement": {
"reactionCount": 1200,
"commentCount": 300,
"totalEngagement": 1500
}
}
]
}
❌ CHƯA CÓ - CẦN BỔ SUNG
Dựa trên Domain Entities, bạn ĐÃ CÓ CẤU TRÚC DATABASE nhưng CHƯA CÓ API cho:
1. QUẢN LÝ BÁO CÁO VI PHẠM (ContentReport)
Database có sẵn:
•	ContentReport entity (link với Admin, User, Post, Comment...)
•	ModerationLog entity
Cần thêm API:
•	❌ GET /api/admin/reports - Danh sách báo cáo
•	❌ GET /api/admin/reports/{id} - Chi tiết báo cáo
•	❌ PUT /api/admin/reports/{id}/resolve - Xử lý báo cáo
•	❌ POST /api/admin/reports/{id}/action - Hành động (xóa post, cảnh cáo user...)
________________________________________
2. QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG
Cần thêm API:
•	❌ GET /api/admin/users - Danh sách tất cả người dùng
•	❌ GET /api/admin/users/{id} - Chi tiết user
•	❌ POST /api/admin/users/{id}/sanction - Phạt/khóa tài khoản
•	❌ DELETE /api/admin/users/{id}/sanction - Gỡ phạt
•	❌ GET /api/admin/users/{id}/sanctions - Lịch sử vi phạm
________________________________________
3. KIỂM DUYỆT NỘI DUNG (ModerationLog)
Database có sẵn: ModerationLog entity
Cần thêm API:
•	❌ GET /api/admin/moderation/posts - Danh sách bài đăng cần kiểm duyệt
•	❌ POST /api/admin/moderation/posts/{id}/approve - Duyệt bài
•	❌ POST /api/admin/moderation/posts/{id}/reject - Từ chối bài
•	❌ DELETE /api/admin/posts/{id} - Xóa bài vi phạm
________________________________________
4. DUYỆT YÊU CẦU NÂNG CẤP BUSINESS ( cái này từ từ nhé, vì đang để tự động duyệt thành công khi thanh toán thành công nên có thể bỏ qua).
Database có sẵn: BusinessVerificationRequest entity
Cần thêm API:
•	❌ GET /api/admin/business-requests - Danh sách yêu cầu nâng cấp
•	❌ GET /api/admin/business-requests/{id} - Chi tiết yêu cầu
•	❌ POST /api/admin/business-requests/{id}/approve - Duyệt
•	❌ POST /api/admin/business-requests/{id}/reject - Từ chối
________________________________________
5. QUẢN LÝ NỘI DUNG (Posts, Comments, Stories)
Cần thêm API:
•	❌ GET /api/admin/posts - Tất cả bài đăng
•	❌ DELETE /api/admin/posts/{id} - Xóa bài vi phạm
•	❌ GET /api/admin/comments - Tất cả comment
•	❌ DELETE /api/admin/comments/{id} - Xóa comment vi phạm
________________________________________
6. LỊCH SỬ HÀNH ĐỘNG ADMIN
Database có sẵn: AdminAction entity
Cần thêm API:
•	❌ GET /api/admin/actions - Lịch sử hành động của tất cả admin
•	❌ GET /api/admin/actions/me - Lịch sử hành động của mình
________________________________________
7. CẤU HÌNH HỆ THỐNG
Cần thêm API:
•	❌ GET /api/admin/settings - Cấu hình hệ thống
•	❌ PUT /api/admin/settings - Cập nhật cấu hình
________________________________________
🎯 KẾT LUẬN
✅ HOÀN TOÀN ĐỦ CHI TIẾT:
1.	✅ Dashboard Thống Kê - CỰC KỲ HOÀN CHỈNH (6 loại biểu đồ + summary)
2.	✅ Quản lý profile Admin
3.	✅ Đổi mật khẩu Admin (với OTP)
❌ THIẾU CÁC CHỨC NĂNG QUẢN TRỊ:
1.	❌ Quản lý báo cáo vi phạm
2.	❌ Quản lý tài khoản người dùng
3.	❌ Kiểm duyệt nội dung
4.	❌ Duyệt yêu cầu Business
5.	❌ Quản lý posts/comments
6.	❌ Lịch sử hành động admin
7.	❌ Cấu hình hệ thống
📌 ĐÁNH GIÁ:
•	Dashboard/Thống kê: 10/10 ⭐ (Xuất sắc, đầy đủ, chi tiết)
•	Chức năng quản trị: 3/10 ⚠️ (Chỉ có profile, thiếu hầu hết tính năng admin quan trọng)

