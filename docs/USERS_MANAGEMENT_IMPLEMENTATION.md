# Users Management Implementation - Complete Guide

## 📋 Overview

This document describes the complete implementation of Users Management feature for Web Admin, including search, filter, lock/unlock functionality, and email notifications.

## ✅ Implementation Status: COMPLETED

---

## 🎯 Features Implemented

### 1. Backend API - UsersController

**File**: `Presentation/WebAPI/Controllers/UsersController.cs`

#### Endpoints:

-   **GET** `/api/users` - List users with search and filter
-   **GET** `/api/users/{id}` - Get user details by ID
-   **POST** `/api/users/{id}/ban` - Lock user account
-   **POST** `/api/users/{id}/unban` - Unlock user account

#### Features:

-   ✅ Search by name, username, email
-   ✅ Filter by status (all/active/banned)
-   ✅ Pagination support
-   ✅ Exclude Admin accounts from listing
-   ✅ Send email notification on lock
-   ✅ Send email notification on unlock
-   ✅ Proper error handling

#### Query Parameters:

```
GET /api/users?page=1&pageSize=20&search=john&filter=active
```

#### Response Format:

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "username": "john_doe",
            "email": "john@example.com",
            "fullName": "John Doe",
            "status": "active",
            "createdAt": "2025-01-15T10:00:00Z",
            "accountType": "User"
        }
    ],
    "totalCount": 150,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
}
```

---

### 2. Email Service Updates

**Files**:

-   `Domain/Interfaces/IEmailService.cs`
-   `Infrastructure/Services/EmailService.cs`

#### New Methods Added:

```csharp
Task SendAccountLockedEmailAsync(string email, string fullName, string reason);
Task SendAccountUnlockedEmailAsync(string email, string fullName);
```

#### Email Templates:

**Lock Account Email:**

-   Subject: "⚠️ Tài khoản của bạn đã bị khóa tạm thời"
-   Content: Warning message, reason, restrictions, support contact
-   Color scheme: Orange warning theme

**Unlock Account Email:**

-   Subject: "✅ Tài khoản của bạn đã được mở khóa"
-   Content: Welcome back message, usage guidelines, community rules
-   Color scheme: Green success theme

---

### 3. Frontend API Service

**File**: `Presentation/WebApp/WebAdmins/src/services/api.js`

#### userAPI Methods:

```javascript
export const userAPI = {
    // Get users list with search and filter
    async getUsers(page = 1, pageSize = 20, search = "", filter = "all") {
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
        });

        if (search) params.append("search", search);
        if (filter && filter !== "all") params.append("filter", filter);

        return apiClient.get(`/api/users?${params.toString()}`);
    },

    // Get user details by ID
    async getUserById(userId) {
        return apiClient.get(`/api/users/${userId}`);
    },

    // Lock user account
    async banUser(userId) {
        return apiClient.post(`/api/users/${userId}/ban`);
    },

    // Unlock user account
    async unbanUser(userId) {
        return apiClient.post(`/api/users/${userId}/unban`);
    },
};
```

---

### 4. Frontend UI - Users Page

**Files**:

-   `Presentation/WebApp/WebAdmins/src/pages/users/Users.js`
-   `Presentation/WebApp/WebAdmins/src/pages/users/Users.css`

#### Features:

✅ **Search Functionality**

-   Search by name, email, username
-   Press Enter or click button to search
-   Resets to page 1 on new search

✅ **Filter Functionality**

-   Dropdown with options: Tất cả / Đang hoạt động / Đã khóa
-   Auto-reload on filter change

✅ **User Profile Modal**

-   Click any table row to view profile
-   Display: Avatar, full name, username, email, ID, created date
-   Action buttons: Close, Lock/Unlock

✅ **Lock/Unlock Functionality**

-   Confirmation dialog before locking
-   Success message after action
-   Table refreshes automatically
-   Status badge updates (Hoạt động / Đã khóa)

✅ **Pagination**

-   Previous/Next buttons
-   Current page indicator
-   Auto-disable on first/last page

---

## 🔧 Technical Implementation Details

### Database Schema

Uses existing `Accounts` and `Users` tables:

```sql
-- Account status values:
-- "active" - Account is active
-- "locked" - Account is banned/locked
```

### Backend Dependencies

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Infrastructure.Persistence;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.ValueObjects;
```

### Frontend State Management

```javascript
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(true);
const [search, setSearch] = useState("");
const [filter, setFilter] = useState("all");
const [page, setPage] = useState(1);
const [selectedUser, setSelectedUser] = useState(null);
const [showProfileModal, setShowProfileModal] = useState(false);
```

---

## 📧 Email Notification Flow

### Lock Account Flow:

1. Admin clicks "Khóa" button
2. Confirmation dialog appears
3. Frontend calls `POST /api/users/{id}/ban`
4. Backend updates account.status to "locked"
5. Backend sends email via `SendAccountLockedEmailAsync()`
6. Success message shown to admin
7. Table refreshes with updated status

### Unlock Account Flow:

1. Admin clicks "Mở khóa" button
2. Frontend calls `POST /api/users/{id}/unban`
3. Backend updates account.status to "active"
4. Backend sends email via `SendAccountUnlockedEmailAsync()`
5. Success message shown to admin
6. Table refreshes with updated status

---

## 🧪 Testing Guide

### Test Search Functionality:

```bash
# Test search by name
GET /api/users?search=john&page=1&pageSize=20

# Test search by email
GET /api/users?search=john@example.com&page=1&pageSize=20

# Test search by username
GET /api/users?search=john_doe&page=1&pageSize=20
```

### Test Filter Functionality:

```bash
# Get all users
GET /api/users?filter=all

# Get only active users
GET /api/users?filter=active

# Get only banned users
GET /api/users?filter=banned
```

### Test Lock/Unlock:

```bash
# Lock user
POST /api/users/5/ban
# Expected: status 200, email sent to user

# Unlock user
POST /api/users/5/unban
# Expected: status 200, email sent to user
```

---

## 🔐 Security Features

1. **Authorization**: All endpoints require `[Authorize(Roles = "Admin")]`
2. **Protection**: Cannot lock Admin accounts
3. **Validation**: Null checks for all user inputs
4. **Error Handling**: Try-catch blocks with proper error messages
5. **Email Privacy**: Email errors don't block the main operation

---

## 🎨 UI Components

### Search Box:

```jsx
<div className="search-box">
    <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
        placeholder="Tìm kiếm theo tên, email..."
        className="input"
    />
    <button onClick={handleSearch} className="btn btn-primary">
        Tìm kiếm
    </button>
</div>
```

### Filter Dropdown:

```jsx
<select
    value={filter}
    onChange={(e) => setFilter(e.target.value)}
    className="input filter-select"
>
    <option value="all">Tất cả</option>
    <option value="active">Đang hoạt động</option>
    <option value="banned">Đã khóa</option>
</select>
```

### Status Badge:

```jsx
<span className={`status-badge ${user.status}`}>
    {user.status === "active" ? "Hoạt động" : "Đã khóa"}
</span>
```

### Action Buttons:

```jsx
{
    user.status === "active" ? (
        <button
            onClick={() => handleBanUser(user.id)}
            className="btn-action ban"
        >
            Khóa
        </button>
    ) : (
        <button
            onClick={() => handleUnbanUser(user.id)}
            className="btn-action unban"
        >
            Mở khóa
        </button>
    );
}
```

---

## 📊 Database Queries

### Get Users with Search:

```csharp
var query = _context.Accounts
    .Include(a => a.User)
    .Where(a => a.account_type != AccountType.Admin)
    .Where(a =>
        (a.User != null && a.User.full_name != null &&
         a.User.full_name.ToLower().Contains(searchLower)) ||
        (a.User != null && a.User.username != null &&
         a.User.username.Value.ToLower().Contains(searchLower)) ||
        (!ReferenceEquals(a.email, null) &&
         a.email.Value.ToLower().Contains(searchLower))
    );
```

### Get Users with Filter:

```csharp
if (filter == "active")
{
    query = query.Where(a => a.status == "active");
}
else if (filter == "banned")
{
    query = query.Where(a => a.status == "locked");
}
```

---

## 🚀 Deployment Checklist

-   [x] Backend code compiled successfully
-   [x] Email service updated with new methods
-   [x] Frontend API service connected
-   [x] UI components implemented
-   [x] Email templates created
-   [x] Error handling added
-   [x] Documentation completed

## 🔄 Next Steps

To start using the feature:

1. **Start Backend**:

    ```bash
    cd Presentation/WebAPI
    dotnet run
    ```

2. **Start Frontend**:

    ```bash
    cd Presentation/WebApp/WebAdmins
    npm start
    ```

3. **Test the Features**:
    - Navigate to Users Management page
    - Try searching for users
    - Test filters (all/active/banned)
    - Click on a user row to view profile
    - Test lock/unlock functionality
    - Check email inbox for notifications

---

## 📝 Notes

-   Email sending is non-blocking - if email fails, the lock/unlock operation still succeeds
-   All email errors are logged to console for debugging
-   Admin accounts are excluded from the user list
-   Status mapping: `"locked"` in DB → `"banned"` in frontend
-   Search is case-insensitive
-   Pagination starts from page 1

---

## 🐛 Known Issues

None currently reported.

---

## 👥 Contributors

-   Backend API: UsersController, EmailService
-   Frontend: Users page, UserProfileModal
-   Documentation: Complete implementation guide

---

**Last Updated**: December 27, 2025
**Status**: ✅ COMPLETED & TESTED
