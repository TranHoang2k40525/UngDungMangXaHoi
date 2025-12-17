# 👤 TÀI LIỆU MODULE PROFILE & USER MANAGEMENT

## 📋 Mục Lục
1. [Tổng quan](#tổng-quan)
2. [Quản lý Profile](#quản-lý-profile)
3. [Avatar Upload & Post](#avatar-upload--post)
4. [Follow/Unfollow System](#followunfollow-system)
5. [Block Users](#block-users)
6. [Private/Public Profiles](#privatepublic-profiles)
7. [API Endpoints](#api-endpoints)

---

## 🎯 Tổng quan

Module Profile quản lý thông tin cá nhân và tương tác giữa users:
- ✅ CRUD profile (full_name, bio, website, etc.)
- ✅ Avatar upload với option đăng bài
- ✅ Follow/Unfollow system
- ✅ Block/Unblock users
- ✅ Private/Public profiles
- ✅ Change email/phone với OTP verification
- ✅ View followers/following lists
- ✅ Check follow status

---

## 📝 Quản Lý Profile

### Get Profile (Current User)

**Endpoint:** `GET /api/users/profile`

**Auth:** Required (JWT)

**Response:**
```json
{
  "message": "Lấy thông tin profile thành công!",
  "data": {
    "user_id": 5,
    "account_id": 3,
    "username": "nguyenvana",
    "full_name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "phone": "0123456789",
    "avatar_url": "http://localhost:5000/Assets/Images/avatar.jpg",
    "bio": "Software Developer 💻",
    "gender": "Nam",
    "date_of_birth": "1990-01-01",
    "address": "Hà Nội",
    "hometown": "Nam Định",
    "job": "Full-stack Developer",
    "website": "https://nguyenvana.dev",
    "is_private": false,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### Get Public Profile (Other User)

**Endpoint:** `GET /api/users/{userId}/profile`

**Auth:** Required (JWT)

**Response:**
```json
{
  "message": "Lấy thông tin user thành công",
  "data": {
    "userId": 10,
    "username": "tranthib",
    "fullName": "Trần Thị B",
    "avatarUrl": "http://localhost:5000/Assets/Images/tranthib_avatar.jpg",
    "bio": "Travel lover 🌍",
    "website": "https://instagram.com/tranthib",
    "address": "TP.HCM",
    "hometown": "Đà Nẵng",
    "gender": "Nữ",
    "postsCount": 45,
    "followersCount": 1200,
    "followingCount": 380,
    "isFollowing": true
  }
}
```

### Update Profile

**Endpoint:** `PUT /api/users/profile`

**Auth:** Required (JWT)

**Request Body:**
```json
{
  "fullName": "Nguyễn Văn A",
  "gender": "Nam",
  "bio": "Software Developer 💻 | Coffee Lover ☕",
  "isPrivate": false,
  "dateOfBirth": "1990-01-01",
  "address": "Hà Nội, Việt Nam",
  "hometown": "Nam Định",
  "job": "Full-stack Developer",
  "website": "https://nguyenvana.dev"
}
```

**Response:**
```json
{
  "message": "Cập nhật profile thành công!"
}
```

---

## 📸 Avatar Upload & Post

### Upload Avatar (with optional post)

**Endpoint:** `POST /api/users/profile/avatar`

**Auth:** Required (JWT)

**Content-Type:** `multipart/form-data`

**Form Data:**
```
avatarFile: [Binary file]
CreatePost: true  // Option: Đăng bài với avatar mới
PostCaption: "New profile picture! 📸"
PostLocation: "Hà Nội"
PostPrivacy: "public"  // public | private | followers
```

**Logic:**
```csharp
1. Validate file (JPG, PNG, max 10MB)
2. Resize ảnh: 400x400px (square crop)
3. Lưu vào Assets/Images/avatars/
4. Update User.avatar_url
5. Nếu CreatePost = true:
   - Tạo Post mới
   - Attach avatar làm media
   - Privacy theo PostPrivacy
6. Return avatar URL
```

**Response:**
```json
{
  "message": "Cập nhật avatar thành công! Bài đăng đã được tạo.",
  "data": {
    "avatarUrl": "http://localhost:5000/Assets/Images/avatars/nguyenvana_avatar.jpg"
  }
}
```

### Remove Avatar

**Endpoint:** `DELETE /api/users/profile/avatar`

**Auth:** Required (JWT)

**Response:**
```json
{
  "message": "Đã gỡ avatar thành công!"
}
```

---

## 👥 Follow/Unfollow System

### Follow User

**Endpoint:** `POST /api/users/{userId}/follow`

**Auth:** Required (JWT)

**Logic:**
```csharp
1. Kiểm tra không thể follow chính mình
2. Kiểm tra đã follow chưa
3. Tạo Follow record
4. Tăng followersCount của target user
5. Tăng followingCount của current user
6. Gửi notification cho target user
7. Return success
```

**Response:**
```json
{
  "message": "Đã follow user thành công!"
}
```

### Unfollow User

**Endpoint:** `DELETE /api/users/{userId}/follow`

**Auth:** Required (JWT)

**Logic:**
```csharp
1. Tìm Follow record
2. Xóa Follow (hard delete)
3. Giảm followersCount của target user
4. Giảm followingCount của current user
5. Return success
```

**Response:**
```json
{
  "message": "Đã unfollow user thành công!"
}
```

### Get Followers

**Endpoint:** `GET /api/users/{userId}/followers?page=1&pageSize=20`

**Auth:** Optional

**Response:**
```json
{
  "data": [
    {
      "user_id": 15,
      "username": "phamvanc",
      "full_name": "Phạm Văn C",
      "avatar_url": "http://localhost:5000/Assets/Images/phamvanc_avatar.jpg",
      "is_following": false,
      "followed_at": "2025-12-10T10:00:00Z"
    }
  ],
  "total": 1200,
  "page": 1,
  "pageSize": 20
}
```

### Get Following

**Endpoint:** `GET /api/users/{userId}/following?page=1&pageSize=20`

**Auth:** Optional

**Response:**
```json
{
  "data": [
    {
      "user_id": 20,
      "username": "dangthid",
      "full_name": "Đặng Thị D",
      "avatar_url": null,
      "is_following": true,
      "followed_at": "2025-12-12T15:30:00Z"
    }
  ],
  "total": 380,
  "page": 1,
  "pageSize": 20
}
```

### Check Follow Status

**Endpoint:** `GET /api/users/{userId}/follow-status`

**Auth:** Required (JWT)

**Response:**
```json
{
  "is_following": true,
  "follows_you": false,
  "is_mutual": false
}
```

---

## 🚫 Block Users

### Block User

**Endpoint:** `POST /api/users/{userId}/block`

**Auth:** Required (JWT)

**Logic:**
```csharp
1. Kiểm tra không thể block chính mình
2. Tạo Block record
3. Auto unfollow (nếu đang follow nhau)
4. Ẩn tất cả posts của blocked user khỏi feed
5. Không thể gửi message cho nhau
6. Return success
```

**Response:**
```json
{
  "message": "Đã chặn user"
}
```

### Unblock User

**Endpoint:** `DELETE /api/users/{userId}/block`

**Auth:** Required (JWT)

**Response:**
```json
{
  "message": "Đã bỏ chặn user"
}
```

### Get Blocked Users

**Endpoint:** `GET /api/users/blocked`

**Auth:** Required (JWT)

**Response:**
```json
{
  "data": [
    {
      "user_id": 99,
      "username": "spammer123",
      "full_name": "Spam Account",
      "blocked_at": "2025-12-13T20:00:00Z"
    }
  ]
}
```

---

## 🔒 Private/Public Profiles

### Set Profile Privacy

**Endpoint:** `PUT /api/users/profile`

**Request Body:**
```json
{
  "isPrivate": true
}
```

**Private Profile Behavior:**
- Chỉ followers mới xem được posts
- Strangers chỉ thấy: avatar, username, full_name, bio
- Không xem được follower/following lists
- Phải request follow → chờ approve (future feature)

**Public Profile Behavior:**
- Ai cũng xem được posts (trừ posts có privacy=private)
- Xem được follower/following lists
- Xem được full profile info

---

## 📞 Change Email/Phone (OTP Verification)

### Request Change Email

**Endpoint:** `POST /api/users/profile/change-email/request`

**Auth:** Required (JWT)

**Request Body:**
```json
{
  "newEmail": "newemail@example.com"
}
```

**Logic:**
```csharp
1. Kiểm tra email chưa được dùng
2. Generate OTP 6 số (expires 1 min)
3. Gửi OTP qua email mới
4. Return success
```

### Verify Change Email

**Endpoint:** `POST /api/users/profile/change-email/verify`

**Auth:** Required (JWT)

**Request Body:**
```json
{
  "newEmail": "newemail@example.com",
  "otp": "123456"
}
```

**Logic:**
```csharp
1. Verify OTP
2. Update Account.email
3. Delete OTP
4. Return success
```

**Response:**
```json
{
  "message": "Đổi email thành công!"
}
```

### Request Change Phone & Verify

**Tương tự Change Email:**
- `POST /api/users/profile/change-phone/request`
- `POST /api/users/profile/change-phone/verify`

---

## 📡 API Endpoints

### Profile Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/profile` | ✅ | Lấy profile của mình |
| GET | `/api/users/{userId}/profile` | ✅ | Xem profile user khác |
| GET | `/api/users/username/{username}/profile` | ✅ | Xem profile by username |
| PUT | `/api/users/profile` | ✅ | Cập nhật profile |

### Avatar

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/users/profile/avatar` | ✅ | Upload avatar (with optional post) |
| DELETE | `/api/users/profile/avatar` | ✅ | Xóa avatar |
| GET | `/api/users/profile/avatar/{userId}` | ❌ | Lấy avatar (static file) |

### Follow System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/users/{userId}/follow` | ✅ | Follow user |
| DELETE | `/api/users/{userId}/follow` | ✅ | Unfollow user |
| GET | `/api/users/{userId}/followers` | ❌ | Lấy danh sách followers |
| GET | `/api/users/{userId}/following` | ❌ | Lấy danh sách following |
| GET | `/api/users/{userId}/follow-status` | ✅ | Check follow status |

### Block System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/users/{userId}/block` | ✅ | Block user |
| DELETE | `/api/users/{userId}/block` | ✅ | Unblock user |
| GET | `/api/users/blocked` | ✅ | Lấy danh sách blocked users |

### Email/Phone Change

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/users/profile/change-email/request` | ✅ | Gửi OTP đổi email |
| POST | `/api/users/profile/change-email/verify` | ✅ | Verify OTP & đổi email |
| POST | `/api/users/profile/change-phone/request` | ✅ | Gửi OTP đổi SĐT |
| POST | `/api/users/profile/change-phone/verify` | ✅ | Verify OTP & đổi SĐT |

---

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY,
    account_id INT NOT NULL UNIQUE,
    username NVARCHAR(50) NOT NULL UNIQUE,
    full_name NVARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    bio NVARCHAR(500),
    gender NVARCHAR(20),
    date_of_birth DATE,
    address NVARCHAR(255),
    hometown NVARCHAR(255),
    job NVARCHAR(100),
    website VARCHAR(500),
    is_private BIT DEFAULT 0,
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    FOREIGN KEY (account_id) REFERENCES Accounts(account_id)
);
```

### Follows Table
```sql
CREATE TABLE Follows (
    follow_id INT PRIMARY KEY IDENTITY,
    follower_user_id INT NOT NULL,
    followed_user_id INT NOT NULL,
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    FOREIGN KEY (follower_user_id) REFERENCES Users(user_id),
    FOREIGN KEY (followed_user_id) REFERENCES Users(user_id),
    UNIQUE (follower_user_id, followed_user_id)
);
```

### Blocks Table
```sql
CREATE TABLE Blocks (
    block_id INT PRIMARY KEY IDENTITY,
    blocker_user_id INT NOT NULL,
    blocked_user_id INT NOT NULL,
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    FOREIGN KEY (blocker_user_id) REFERENCES Users(user_id),
    FOREIGN KEY (blocked_user_id) REFERENCES Users(user_id),
    UNIQUE (blocker_user_id, blocked_user_id)
);
```

---

**📅 Last Updated:** December 14, 2025  
**📌 Version:** 1.0.0
