# 👨‍💼📊 TÀI LIỆU MODULE ADMIN

## 📋 Mục Lục
1. [Tổng quan](#tổng-quan)
2. [Dashboard Statistics](#dashboard-statistics)
3. [User Management](#user-management)
4. [Content Moderation](#content-moderation)
5. [Business Analytics](#business-analytics)
6. [System Logs](#system-logs)

---

## 🎯 Tổng quan

### Admin Features
- ✅ **Dashboard** - Tổng quan hệ thống
- ✅ **User Management** - Quản lý users, block/unblock
- ✅ **Content Moderation** - Review toxic content
- ✅ **Business Analytics** - Thống kê business accounts
- ✅ **Revenue Tracking** - Theo dõi doanh thu
- ✅ **System Logs** - Logs AI moderation, errors

### Admin Roles
- 🔴 **Super Admin** - Full access
- 🟡 **Moderator** - Content review only
- 🟢 **Analyst** - View reports only

---

## 📊 Dashboard Statistics

### Get Dashboard Summary

**Endpoint:** `GET /api/DashBoard/summary`

**Auth:** Required (JWT - Admin role)

**Query Parameters:**
```
?startDate=2025-12-01  // Optional, default: 30 days ago
&endDate=2025-12-14    // Optional, default: today
&chartGroupBy=Day      // Day | Week | Month
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy dữ liệu dashboard thành công",
  "data": {
    "users": {
      "total": 15487,
      "active_today": 3542,
      "new_this_month": 876,
      "business_accounts": 234
    },
    "posts": {
      "total": 45678,
      "today": 456,
      "images": 32145,
      "videos": 13533
    },
    "engagement": {
      "total_likes": 234567,
      "total_comments": 56789,
      "total_shares": 8901,
      "avg_engagement_rate": 0.145
    },
    "revenue": {
      "total_this_month": 12450000,
      "total_all_time": 145780000,
      "business_upgrades": 50,
      "business_posts_revenue": 8900000
    },
    "moderation": {
      "toxic_comments_detected": 234,
      "toxic_posts_detected": 12,
      "auto_deleted": 189,
      "manual_review_pending": 57
    }
  }
}
```

### Get New User Statistics

**Endpoint:** `GET /api/DashBoard/new-user-stats`

**Query Parameters:**
```
?fromDate=2025-12-01
&toDate=2025-12-14
&options=Day  // Day | Week | Month
```

**Response:**
```json
{
  "data": [
    {
      "date": "2025-12-07",
      "new_users_count": 45
    },
    {
      "date": "2025-12-08",
      "new_users_count": 52
    }
  ]
}
```

### Get Active Users

**Endpoint:** `GET /api/DashBoard/activeUser`

**Auth:** Required (JWT - Admin)

**Response:**
```json
{
  "data": {
    "today": 3542,
    "this_week": 12345,
    "this_month": 45678
  }
}
```

### Get Business Growth Chart

**Endpoint:** `GET /api/DashBoard/business-growth-chart`

**Query Parameters:**
```
?startDate=2025-12-01
&endDate=2025-12-14
&group=Day  // Day | Week | Month
```

**Response:**
```json
{
  "data": [
    {
      "date": "2025-12-07",
      "new_business_accounts": 5
    },
    {
      "date": "2025-12-08",
      "new_business_accounts": 7
    }
  ]
}
```

### Get Revenue Chart

**Endpoint:** `GET /api/DashBoard/revenue-chart`

**Query Parameters:**
```
?startDate=2025-12-01
&endDate=2025-12-14
&group=Day  // Day | Week | Month
```

**Response:**
```json
{
  "data": [
    {
      "date": "2025-12-07",
      "revenue": 2450000
    },
    {
      "date": "2025-12-08",
      "revenue": 3890000
    }
  ]
}
```

### Get Post Growth Chart

**Endpoint:** `GET /api/DashBoard/post-growth-chart`

**Query Parameters:**
```
?startDate=2025-12-01
&endDate=2025-12-14
&group=Day  // Day | Week | Month
```

**Response:**
```json
{
  "data": [
    {
      "date": "2025-12-07",
      "posts_count": 145
    },
    {
      "date": "2025-12-08",
      "posts_count": 167
    }
  ]
}
```

---

## 👥 User Management

### Get All Users

**Endpoint:** `GET /api/admin/users`

**Auth:** Required (JWT - Admin)

**Query Parameters:**
```
?page=1
&pageSize=50
&accountType=all  // all | regular | business
&status=all  // all | active | blocked
&sortBy=created  // created | username | posts_count
&order=desc  // asc | desc
```

**Response:**
```json
{
  "data": [
    {
      "user_id": 123,
      "username": "nguyenvana",
      "full_name": "Nguyễn Văn A",
      "email": "nguyenvana@gmail.com",
      "phone": "0901234567",
      "account_type": "business",
      "is_blocked": false,
      "posts_count": 156,
      "followers_count": 1234,
      "following_count": 567,
      "created_at": "2024-06-15T10:00:00Z",
      "last_active": "2025-12-14T09:45:00Z"
    }
  ],
  "total": 15487,
  "page": 1,
  "pageSize": 50
}
```

### Block/Unblock User

**Endpoint:** `POST /api/admin/users/{userId}/block`

**Auth:** Required (JWT - Admin/Moderator)

**Request Body:**
```json
{
  "action": "block",  // block | unblock
  "reason": "Spam and inappropriate content"
}
```

**Logic:**
```csharp
1. If block:
   - Set is_blocked = true
   - Delete all active sessions
   - Notify user via email
   - Hide all posts (soft delete)
2. If unblock:
   - Set is_blocked = false
   - Restore posts
   - Notify user
```

### Delete User

**Endpoint:** `DELETE /api/admin/users/{userId}`

**Auth:** Required (JWT - Super Admin only)

**Description:** Xóa vĩnh viễn user và toàn bộ data (posts, comments, messages)

---

## 🛡️ Content Moderation

### Get Flagged Content

**Endpoint:** `GET /api/admin/moderation/flagged`

**Auth:** Required (JWT - Admin/Moderator)

**Query Parameters:**
```
?type=all  // all | posts | comments
&status=pending  // pending | reviewed | approved | deleted
```

**Response:**
```json
{
  "data": [
    {
      "content_id": 456,
      "content_type": "comment",
      "content": "This is a toxic comment...",
      "author_id": 789,
      "author_username": "baduser123",
      "post_id": 123,
      "toxicity_score": 0.87,  // 0-1, higher = more toxic
      "detected_categories": ["hate_speech", "profanity"],
      "flagged_at": "2025-12-14T10:30:00Z",
      "status": "pending",
      "auto_deleted": false
    }
  ],
  "total": 57
}
```

### Review Content

**Endpoint:** `POST /api/admin/moderation/review`

**Auth:** Required (JWT - Admin/Moderator)

**Request Body:**
```json
{
  "content_id": 456,
  "content_type": "comment",
  "action": "delete",  // approve | delete | warn_user
  "reason": "Confirmed hate speech violation"
}
```

**Actions:**
- **approve** - Nội dung OK, bỏ flag
- **delete** - Xóa nội dung
- **warn_user** - Giữ nội dung nhưng cảnh báo user

---

## 💼 Business Analytics

### Business Growth Report

**Endpoint:** `GET /api/admin/business/growth`

**Auth:** Required (JWT - Admin/Analyst)

**Query Parameters:**
```
?period=30  // 7 | 30 | 90 | 365 days
```

**Response:**
```json
{
  "data": {
    "new_business_accounts": 50,
    "total_business_accounts": 234,
    "revenue_this_period": 12450000,
    "average_order_value": 249000,
    "by_plan": {
      "basic": 20,
      "standard": 23,
      "premium": 7
    },
    "churn_rate": 0.05,  // 5% users không renew
    "growth_rate": 0.27  // 27% growth
  }
}
```

### Top Business Posts

**Endpoint:** `GET /api/admin/business/top-posts`

**Auth:** Required (JWT - Admin)

**Query Parameters:**
```
?period=7  // days
&metric=impressions  // impressions | clicks | engagement
&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "post_id": 789,
      "business_user_id": 123,
      "business_name": "Shop ABC",
      "caption": "🎉 Special sale 50% off!",
      "impressions": 45678,
      "clicks": 2345,
      "engagement_rate": 0.051,  // 5.1%
      "budget_spent": 450000,
      "roi": 3.4  // 3.4x return on investment
    }
  ]
}
```

---

## 💰 Revenue Tracking

### Revenue Report

**Endpoint:** `GET /api/admin/revenue`

**Auth:** Required (JWT - Admin/Analyst)

**Query Parameters:**
```
?startDate=2025-12-01
&endDate=2025-12-14
```

**Response:**
```json
{
  "data": {
    "total_revenue": 12450000,
    "by_source": {
      "business_upgrades": 8650000,
      "business_posts": 3800000
    },
    "by_plan": {
      "basic": 1980000,
      "standard": 5727000,
      "premium": 2943000
    },
    "transactions": [
      {
        "order_id": "ORDER-20251214-123456",
        "user_id": 456,
        "username": "businessuser1",
        "type": "upgrade",
        "plan": "standard",
        "amount": 249000,
        "created_at": "2025-12-14T10:00:00Z"
      }
    ]
  }
}
```

---

## 📝 System Logs

### AI Moderation Logs

**Endpoint:** `GET /api/admin/logs/moderation`

**Auth:** Required (JWT - Admin)

**Query Parameters:**
```
?page=1
&pageSize=50
&severity=all  // all | high | medium | low
```

**Response:**
```json
{
  "data": [
    {
      "log_id": 12345,
      "content_type": "comment",
      "content_id": 456,
      "author_id": 789,
      "content_preview": "This is toxic...",
      "toxicity_score": 0.87,
      "categories": ["hate_speech", "profanity"],
      "action_taken": "auto_delete",
      "created_at": "2025-12-14T10:30:00Z"
    }
  ]
}
```

### Error Logs

**Endpoint:** `GET /api/admin/logs/errors`

**Auth:** Required (JWT - Admin)

**Response:**
```json
{
  "data": [
    {
      "log_id": 67890,
      "level": "error",
      "message": "Failed to connect to ML service",
      "stack_trace": "...",
      "endpoint": "/api/comments",
      "user_id": 123,
      "created_at": "2025-12-14T11:00:00Z"
    }
  ]
}
```

---

## 📊 Top Content Analytics

### Top Engaged Posts

**Endpoint:** `GET /api/DashBoard/posts-top`

**Auth:** Required (JWT - Admin)

**Query Parameters:**
```
?topN=10
&startDate=2025-12-01  // Optional
&endDate=2025-12-14    // Optional
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy top 10 bài đăng thành công",
  "data": [
    {
      "post_id": 123,
      "user_id": 456,
      "username": "influencer1",
      "caption": "Amazing sunset! 🌅",
      "likes": 5678,
      "comments": 234,
      "shares": 89,
      "engagement_rate": 0.245,
      "created_at": "2025-12-10T15:00:00Z"
    }
  ]
}
```

### Top Keywords

**Endpoint:** `GET /api/DashBoard/keyword-top`

**Auth:** Required (JWT - Admin)

**Query Parameters:**
```
?topN=10
&startDate=2025-12-01
&endDate=2025-12-14
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy top 10 từ khóa thành công",
  "data": [
    {
      "keyword": "travel",
      "search_count": 456,
      "trend": "up"
    },
    {
      "keyword": "food",
      "search_count": 389,
      "trend": "stable"
    }
  ]
}
```

---

## 🔐 Admin Authentication

### Admin Login

**Endpoint:** `POST /api/admin/login`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "AdminPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "admin_id": 1,
    "email": "admin@example.com",
    "role": "super_admin",  // super_admin | moderator | analyst
    "full_name": "System Admin"
  }
}
```

**JWT Claims:**
```json
{
  "admin_id": "1",
  "email": "admin@example.com",
  "role": "super_admin",
  "exp": 1734265200
}
```

---

## 📊 Database Schema

```sql
CREATE TABLE Admins (
    admin_id INT PRIMARY KEY IDENTITY,
    email NVARCHAR(100) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(100),
    role VARCHAR(20) DEFAULT 'moderator',  -- super_admin | moderator | analyst
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    last_login DATETIMEOFFSET
);

CREATE TABLE ModerationLogs (
    log_id INT PRIMARY KEY IDENTITY,
    content_type VARCHAR(20) NOT NULL,  -- post | comment
    content_id INT NOT NULL,
    author_id INT NOT NULL,
    content_text NVARCHAR(MAX),
    toxicity_score FLOAT,
    detected_categories NVARCHAR(500),
    action_taken VARCHAR(50),  -- auto_delete | flagged | approved
    reviewed_by_admin_id INT,
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    FOREIGN KEY (reviewed_by_admin_id) REFERENCES Admins(admin_id)
);

CREATE TABLE SystemLogs (
    log_id INT PRIMARY KEY IDENTITY,
    level VARCHAR(20) NOT NULL,  -- info | warning | error | critical
    message NVARCHAR(MAX),
    stack_trace NVARCHAR(MAX),
    endpoint NVARCHAR(200),
    user_id INT,
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE()
);
```

---

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/login` | ❌ | Admin login |
| GET | `/api/DashBoard/summary` | ✅ | Dashboard overview |
| GET | `/api/DashBoard/new-user-stats` | ✅ | New user statistics |
| GET | `/api/DashBoard/activeUser` | ✅ | Active users count |
| GET | `/api/DashBoard/business-growth-chart` | ✅ | Business growth chart |
| GET | `/api/DashBoard/revenue-chart` | ✅ | Revenue chart |
| GET | `/api/DashBoard/post-growth-chart` | ✅ | Post growth chart |
| GET | `/api/DashBoard/keyword-top` | ✅ | Top keywords |
| GET | `/api/DashBoard/posts-top` | ✅ | Top engaged posts |
| GET | `/api/admin/users` | ✅ | List all users |
| POST | `/api/admin/users/{id}/block` | ✅ | Block/unblock user |
| DELETE | `/api/admin/users/{id}` | ✅ | Delete user |
| GET | `/api/admin/moderation/flagged` | ✅ | Flagged content |
| POST | `/api/admin/moderation/review` | ✅ | Review content |
| GET | `/api/admin/business/growth` | ✅ | Business growth |
| GET | `/api/admin/business/top-posts` | ✅ | Top business posts |
| GET | `/api/admin/revenue` | ✅ | Revenue report |
| GET | `/api/admin/logs/moderation` | ✅ | Moderation logs |
| GET | `/api/admin/logs/errors` | ✅ | Error logs |
| GET | `/api/admin/analytics/top-posts` | ✅ | Top posts |
| GET | `/api/admin/analytics/top-keywords` | ✅ | Top keywords |

---

**📅 Last Updated:** December 14, 2025  
**📌 Version:** 1.0.0
