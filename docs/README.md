# 📚 Tài liệu API - Ứng Dụng Mạng Xã Hội

> Xem thêm phân tích kiến trúc và sơ đồ tại: [ARCHITECTURE](./ARCHITECTURE.md)

## 📋 Mục Lục

Hệ thống bao gồm 12 module chính với tài liệu đầy đủ:

### 🔐 1. [Authentication Module](./AUTHENTICATION_MODULE.md)
Xác thực và quản lý tài khoản
- ✅ Đăng ký tài khoản (OTP verification)
- ✅ Đăng nhập (JWT Bearer tokens)
- ✅ Quên mật khẩu (OTP recovery)
- ✅ Đổi mật khẩu
- ✅ Refresh token

### 📰 2. [Posts Module](./POSTS_MODULE.md)
Quản lý bài viết và feed
- ✅ Tạo/sửa/xóa posts (image/video/text)
- ✅ Feed algorithm (following users, engagement-based)
- ✅ Reels (short videos)
- ✅ AI Content Moderation (PhoBERT toxic detection)
- ✅ Business post injection

### 💬 3. [Messages Module](./MESSAGES_MODULE.md)
Chat 1-1 real-time
- ✅ Gửi/nhận tin nhắn
- ✅ SignalR real-time messaging
- ✅ Message recall (thu hồi tin nhắn)
- ✅ Chỉ chat với mutual followers

### 👥 4. [Group Chat Module](./GROUP_CHAT_MODULE.md)
Nhắn tin nhóm đa năng
- ✅ Tạo/xóa nhóm
- ✅ Thêm/xóa thành viên
- ✅ Owner/Admin/Member roles
- ✅ Reactions on messages
- ✅ Pin messages
- ✅ Read receipts
- ✅ Media sharing (Cloudinary)

### 👤 5. [Profile Module](./PROFILE_MODULE.md)
Quản lý hồ sơ cá nhân
- ✅ Upload avatar (với tùy chọn tạo post)
- ✅ Follow/Unfollow users
- ✅ Block users
- ✅ Public/Private profiles
- ✅ Change email/phone (OTP verification)

### 💬💖📤 6. [Comments, Reactions & Shares Module](./COMMENTS_REACTIONS_SHARES_MODULE.md)
Tương tác với bài viết
- ✅ Nested comments (replies)
- ✅ Reactions on comments
- ✅ AI Moderation (auto-delete toxic sau 6s)
- ✅ 6 reaction types (Like, Love, Haha, Wow, Sad, Angry)
- ✅ Share posts with caption

### 📷 7. [Stories Module](./STORIES_MODULE.md)
Stories 24 giờ
- ✅ Upload photo/video stories
- ✅ Auto-expire sau 24h
- ✅ View tracking
- ✅ Cloudinary storage
- ✅ Background cleanup service

### 🔍 8. [Search Module](./SEARCH_MODULE.md)
Tìm kiếm users và posts
- ✅ Search users (priority: Following > Messaged > Stranger)
- ✅ Search posts (keyword, hashtags)
- ✅ Search history
- ✅ Auto-complete suggestions

### 🔔 9. [Notifications Module](./NOTIFICATIONS_MODULE.md)
Thông báo real-time
- ✅ SignalR NotificationHub
- ✅ 10 notification types (Like, Comment, Follow, Message, etc.)
- ✅ Read/Unread status
- ✅ Batch operations
- ✅ Notification preferences

### 💼 10. [Business Module](./BUSINESS_MODULE.md)
Tài khoản kinh doanh
- ✅ MoMo payment integration
- ✅ Account upgrade (Basic/Standard/Premium)
- ✅ Business post injection vào Feed/Reels
- ✅ Impression/Click tracking
- ✅ ROI analytics

### 👨‍💼 11. [Admin Module](./ADMIN_MODULE.md)
Quản trị hệ thống
- ✅ Dashboard statistics
- ✅ User management (block/unblock/delete)
- ✅ Content moderation (review toxic content)
- ✅ Business analytics
- ✅ Revenue tracking
- ✅ System logs

---

## 🚀 Công Nghệ Sử Dụng

### Backend
- **Framework:** ASP.NET Core 6+ Web API
- **Architecture:** Clean Architecture (Domain/Application/Infrastructure/Presentation)
- **Database:** SQL Server + Entity Framework Core
- **Authentication:** JWT Bearer tokens
- **Password Hashing:** BCrypt
- **Real-time:** SignalR (Chat, Notifications)

### AI/ML
- **PhoBERT** - Vietnamese BERT for toxic content detection
- **Python ML Service** - Flask API for AI moderation
- **Auto-moderation** - Toxic comments deleted after 6 seconds

### External Services
- **MoMo** - Payment gateway for business upgrades
- **Cloudinary** - Cloud storage for media (stories, group chat)
- **SMTP** - Email service for OTP verification

---

## 📡 Base URL

```
Development: http://localhost:5000
Production: https://api.yourdomain.com
```

---

## 🔑 Authentication

Hầu hết endpoints yêu cầu JWT token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Lấy token:**
```bash
POST /api/auth/login
{
  "username": "nguyenvana",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "def50200...",
  "expiresIn": 3600
}
```

---

## 📊 Module Features Matrix

| Module | Create | Read | Update | Delete | Real-time | AI/ML | Payment |
|--------|--------|------|--------|--------|-----------|-------|---------|
| **Auth** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Posts** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ PhoBERT | ❌ |
| **Messages** | ✅ | ✅ | ✅ | ✅ | ✅ SignalR | ❌ | ❌ |
| **Group Chat** | ✅ | ✅ | ✅ | ✅ | ✅ SignalR | ❌ | ❌ |
| **Profile** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Comments** | ✅ | ✅ | ✅ | ✅ | ✅ SignalR | ✅ PhoBERT | ❌ |
| **Reactions** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Shares** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Stories** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Search** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Notifications** | ❌ | ✅ | ✅ | ✅ | ✅ SignalR | ❌ | ❌ |
| **Business** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ MoMo |
| **Admin** | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 🔄 SignalR Hubs

### MessageHub
```
Connection URL: ws://localhost:5000/hubs/message
Events: MessageReceived, MessageRecalled, MessageDeleted
```

### GroupMessageHub
```
Connection URL: ws://localhost:5000/hubs/groupmessage
Events: GroupMessageReceived, MessageReactionAdded, MessagePinned
```

### NotificationHub
```
Connection URL: ws://localhost:5000/hubs/notification
Events: ReceiveNotification
```

### CommentHub
```
Connection URL: ws://localhost:5000/hubs/comment
Events: CommentAdded, CommentReplyAdded, CommentDeleted
```

---

## 🎯 Quick Start Guide

### 1. Đăng ký tài khoản
```bash
POST /api/auth/register
{
  "username": "nguyenvana",
  "email": "nguyenvana@gmail.com",
  "password": "Password123!",
  "fullName": "Nguyễn Văn A"
}
```

### 2. Xác thực OTP
```bash
POST /api/auth/verify-otp
{
  "email": "nguyenvana@gmail.com",
  "otp": "123456"
}
```

### 3. Đăng nhập
```bash
POST /api/auth/login
{
  "username": "nguyenvana",
  "password": "Password123!"
}
```

### 4. Tạo post đầu tiên
```bash
POST /api/posts
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [image.jpg]
caption: "Hello world! 🌍"
privacySetting: "public"
```

### 5. Kết nối SignalR
```javascript
const connection = new signalR.HubConnectionBuilder()
  .withUrl('http://localhost:5000/hubs/message', {
    accessTokenFactory: () => token
  })
  .build();

await connection.start();
```

---

## 📈 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* result data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    "Validation error 1",
    "Validation error 2"
  ]
}
```

### Pagination Response
```json
{
  "data": [ /* items */ ],
  "total": 1234,
  "page": 1,
  "pageSize": 20,
  "totalPages": 62
}
```

---

## 🔒 Security Features

- ✅ **JWT Authentication** - Access & Refresh tokens
- ✅ **BCrypt Password Hashing** - Secure password storage
- ✅ **OTP Verification** - Email-based 2FA
- ✅ **Rate Limiting** - Prevent brute force attacks
- ✅ **CORS** - Cross-origin protection
- ✅ **Input Validation** - Data sanitization
- ✅ **AI Content Moderation** - Toxic content detection

---

## 🚦 HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created |
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | Invalid/missing token |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 500 | Server Error | Internal error |

---

## 📞 Support & Contact

- **Email:** support@yourdomain.com
- **Documentation:** https://docs.yourdomain.com
- **Issue Tracker:** https://github.com/yourrepo/issues

---

## 📝 Changelog

### Version 1.0.0 (December 14, 2025)
- ✅ Initial release
- ✅ 12 modules fully documented
- ✅ JWT authentication
- ✅ SignalR real-time features
- ✅ AI content moderation
- ✅ MoMo payment integration
- ✅ Cloudinary media storage

---

## 📄 License

Copyright © 2025. All rights reserved.

---

**📅 Last Updated:** December 14, 2025  
**📌 Version:** 1.0.0  
**🔗 Repository:** [GitHub Link]
