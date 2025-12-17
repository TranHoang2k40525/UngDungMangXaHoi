# 🔔 TÀI LIỆU MODULE NOTIFICATIONS

## 📋 Mục Lục
1. [Tổng quan](#tổng-quan)
2. [Notification Types](#notification-types)
3. [Get Notifications](#get-notifications)
4. [Mark as Read](#mark-as-read)
5. [SignalR Real-time](#signalr-real-time)
6. [Notification Settings](#notification-settings)

---

## 🎯 Tổng quan

### Notification Features
- ✅ **Real-time push** - SignalR NotificationHub
- ✅ **Multiple types** - Like, Comment, Follow, Message, etc.
- ✅ **Read/Unread status** - Track read notifications
- ✅ **Batch operations** - Mark all as read
- ✅ **Preferences** - Enable/disable per type

### Notification Types
| Type | Icon | Description |
|------|------|-------------|
| **Like** | ❤️ | Ai đó thích post của bạn |
| **Comment** | 💬 | Ai đó comment post của bạn |
| **Reply** | 💬 | Ai đó reply comment của bạn |
| **Follow** | 👤 | Ai đó follow bạn |
| **Message** | 📨 | Tin nhắn mới (1-1 chat) |
| **GroupMessage** | 👥 | Tin nhắn nhóm mới |
| **Mention** | @ | Ai đó mention bạn |
| **Share** | 📤 | Ai đó share post của bạn |
| **Reaction** | 😍 | Ai đó react post của bạn |
| **TagPost** | 🏷️ | Ai đó tag bạn trong post |

---

## 📝 Get Notifications

**Endpoint:** `GET /api/notifications`

**Auth:** Required (JWT)

**Query Parameters:**
```
?page=1
&pageSize=20
&type=all  // all | like | comment | follow | message
&isRead=null  // null = all, true = read only, false = unread only
```

**Example:**
```http
GET /api/notifications?page=1&pageSize=20&type=all&isRead=false
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "notification_id": 456,
      "type": "Like",
      "message": "nguyenvana và 15 người khác đã thích bài viết của bạn",
      "from_user": {
        "user_id": 10,
        "username": "nguyenvana",
        "full_name": "Nguyễn Văn A",
        "avatar_url": "http://localhost:5000/Assets/Images/avatar.jpg"
      },
      "post_id": 123,
      "post_thumbnail": "http://localhost:5000/Assets/Images/post123.jpg",
      "is_read": false,
      "created_at": "2025-12-14T11:00:00Z"
    },
    {
      "notification_id": 457,
      "type": "Comment",
      "message": "tranthib đã bình luận: \"Great photo! 👍\"",
      "from_user": {
        "user_id": 15,
        "username": "tranthib",
        "full_name": "Trần Thị B",
        "avatar_url": null
      },
      "post_id": 125,
      "comment_id": 789,
      "post_thumbnail": "http://localhost:5000/Assets/Images/post125.jpg",
      "is_read": false,
      "created_at": "2025-12-14T10:45:00Z"
    },
    {
      "notification_id": 458,
      "type": "Follow",
      "message": "levanc đã bắt đầu follow bạn",
      "from_user": {
        "user_id": 20,
        "username": "levanc",
        "full_name": "Lê Văn C",
        "avatar_url": "http://localhost:5000/Assets/Images/avatar3.jpg"
      },
      "is_read": true,
      "created_at": "2025-12-14T10:30:00Z"
    },
    {
      "notification_id": 459,
      "type": "Message",
      "message": "phamthid đã gửi tin nhắn cho bạn",
      "from_user": {
        "user_id": 25,
        "username": "phamthid",
        "full_name": "Phạm Thị D",
        "avatar_url": null
      },
      "conversation_id": 34,
      "is_read": false,
      "created_at": "2025-12-14T10:15:00Z"
    }
  ],
  "unread_count": 12,
  "total": 234,
  "page": 1,
  "pageSize": 20
}
```

---

## 📝 Mark as Read

### Mark Single Notification

**Endpoint:** `PUT /api/notifications/{notificationId}/read`

**Auth:** Required (JWT)

**Request:** Empty body

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### Mark All as Read

**Endpoint:** `PUT /api/notifications/read-all`

**Auth:** Required (JWT)

**Request:** Empty body

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "updated_count": 12
}
```

---

## 📝 Delete Notification

**Endpoint:** `DELETE /api/notifications/{notificationId}`

**Auth:** Required (JWT)

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

## 📡 SignalR Real-time Notifications

### NotificationHub

**Connection URL:** `ws://localhost:5000/hubs/notification`

**C# Hub Implementation:**
```csharp
public class NotificationHub : Hub
{
    private readonly INotificationService _notificationService;

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst("user_id")?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            // Join user's personal notification room
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
            
            Console.WriteLine($"User {userId} connected to NotificationHub");
        }
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        var userId = Context.User?.FindFirst("user_id")?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
            Console.WriteLine($"User {userId} disconnected from NotificationHub");
        }
        
        await base.OnDisconnectedAsync(exception);
    }
}
```

### Sending Notifications

**C# Service:**
```csharp
public class NotificationService : INotificationService
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly INotificationRepository _notificationRepo;

    public async Task SendNotificationAsync(NotificationDto notification)
    {
        // 1. Save to database
        await _notificationRepo.CreateNotificationAsync(notification);
        
        // 2. Send real-time via SignalR
        await _hubContext.Clients
            .Group($"user_{notification.ToUserId}")
            .SendAsync("ReceiveNotification", notification);
    }
    
    // Like notification
    public async Task NotifyLikeAsync(int postId, int likerUserId)
    {
        var post = await _postRepo.GetPostByIdAsync(postId);
        var liker = await _userRepo.GetUserByIdAsync(likerUserId);
        
        if (post.UserId == likerUserId) return;  // Don't notify self
        
        var notification = new NotificationDto
        {
            Type = "Like",
            Message = $"{liker.Username} đã thích bài viết của bạn",
            FromUserId = likerUserId,
            ToUserId = post.UserId,
            PostId = postId,
            CreatedAt = DateTime.UtcNow
        };
        
        await SendNotificationAsync(notification);
    }
    
    // Comment notification
    public async Task NotifyCommentAsync(int postId, int commenterId, string content)
    {
        var post = await _postRepo.GetPostByIdAsync(postId);
        var commenter = await _userRepo.GetUserByIdAsync(commenterId);
        
        if (post.UserId == commenterId) return;
        
        var notification = new NotificationDto
        {
            Type = "Comment",
            Message = $"{commenter.Username} đã bình luận: \"{content.Substring(0, Math.Min(50, content.Length))}...\"",
            FromUserId = commenterId,
            ToUserId = post.UserId,
            PostId = postId,
            CreatedAt = DateTime.UtcNow
        };
        
        await SendNotificationAsync(notification);
    }
    
    // Follow notification
    public async Task NotifyFollowAsync(int followerId, int followedId)
    {
        var follower = await _userRepo.GetUserByIdAsync(followerId);
        
        var notification = new NotificationDto
        {
            Type = "Follow",
            Message = $"{follower.Username} đã bắt đầu follow bạn",
            FromUserId = followerId,
            ToUserId = followedId,
            CreatedAt = DateTime.UtcNow
        };
        
        await SendNotificationAsync(notification);
    }
}
```

### Frontend SignalR Client

**JavaScript:**
```javascript
import * as signalR from '@microsoft/signalr';

class NotificationClient {
  constructor(token) {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/hubs/notification', {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();
    
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    // Receive notification
    this.connection.on('ReceiveNotification', (notification) => {
      console.log('New notification:', notification);
      
      // Update UI
      this.showNotificationToast(notification);
      this.updateNotificationBadge();
      this.addToNotificationList(notification);
    });
    
    // Connection state
    this.connection.onreconnecting((error) => {
      console.log('Reconnecting...', error);
    });
    
    this.connection.onreconnected((connectionId) => {
      console.log('Reconnected:', connectionId);
    });
    
    this.connection.onclose((error) => {
      console.log('Connection closed:', error);
    });
  }
  
  async start() {
    try {
      await this.connection.start();
      console.log('NotificationHub connected');
    } catch (err) {
      console.error('Connection failed:', err);
      setTimeout(() => this.start(), 5000);
    }
  }
  
  async stop() {
    await this.connection.stop();
  }
  
  showNotificationToast(notification) {
    // Show toast/snackbar
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
      <img src="${notification.from_user.avatar_url || '/default-avatar.png'}" />
      <div>
        <strong>${notification.from_user.full_name}</strong>
        <p>${notification.message}</p>
      </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 5000);
  }
  
  updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const currentCount = parseInt(badge.textContent) || 0;
    badge.textContent = currentCount + 1;
    badge.style.display = 'block';
  }
  
  addToNotificationList(notification) {
    const list = document.getElementById('notificationList');
    const item = this.createNotificationItem(notification);
    list.insertBefore(item, list.firstChild);
  }
  
  createNotificationItem(notification) {
    const item = document.createElement('div');
    item.className = `notification-item ${notification.is_read ? '' : 'unread'}`;
    item.dataset.id = notification.notification_id;
    
    // Build HTML based on type
    let icon = '🔔';
    if (notification.type === 'Like') icon = '❤️';
    else if (notification.type === 'Comment') icon = '💬';
    else if (notification.type === 'Follow') icon = '👤';
    else if (notification.type === 'Message') icon = '📨';
    
    item.innerHTML = `
      <div class="notification-icon">${icon}</div>
      <img src="${notification.from_user.avatar_url || '/default-avatar.png'}" 
           class="notification-avatar" />
      <div class="notification-content">
        <p>${notification.message}</p>
        <span class="notification-time">${this.formatTime(notification.created_at)}</span>
      </div>
    `;
    
    item.addEventListener('click', () => {
      this.handleNotificationClick(notification);
    });
    
    return item;
  }
  
  handleNotificationClick(notification) {
    // Mark as read
    this.markAsRead(notification.notification_id);
    
    // Navigate based on type
    if (notification.type === 'Like' || notification.type === 'Comment') {
      window.location.href = `/posts/${notification.post_id}`;
    } else if (notification.type === 'Follow') {
      window.location.href = `/profile/${notification.from_user.username}`;
    } else if (notification.type === 'Message') {
      window.location.href = `/messages/${notification.conversation_id}`;
    }
  }
  
  async markAsRead(notificationId) {
    await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  }
  
  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  }
}

// Usage
const token = localStorage.getItem('token');
const notificationClient = new NotificationClient(token);
await notificationClient.start();
```

---

## 📝 Notification Settings

**Endpoint:** `GET/PUT /api/notifications/settings`

**Auth:** Required (JWT)

### Get Settings

**Response:**
```json
{
  "data": {
    "like_enabled": true,
    "comment_enabled": true,
    "follow_enabled": true,
    "message_enabled": true,
    "group_message_enabled": true,
    "mention_enabled": true,
    "share_enabled": true,
    "push_enabled": true,
    "email_enabled": false
  }
}
```

### Update Settings

**Request Body:**
```json
{
  "like_enabled": false,
  "comment_enabled": true,
  "email_enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated"
}
```

---

## 📊 Database Schema

```sql
CREATE TABLE Notifications (
    notification_id INT PRIMARY KEY IDENTITY,
    type VARCHAR(50) NOT NULL,  -- Like | Comment | Follow | Message | etc.
    message NVARCHAR(500) NOT NULL,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    post_id INT,
    comment_id INT,
    conversation_id INT,
    is_read BIT DEFAULT 0,
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    FOREIGN KEY (from_user_id) REFERENCES Users(user_id),
    FOREIGN KEY (to_user_id) REFERENCES Users(user_id),
    FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE SET NULL,
    INDEX idx_to_user_created (to_user_id, created_at DESC),
    INDEX idx_unread (to_user_id, is_read) WHERE is_read = 0
);

CREATE TABLE NotificationSettings (
    user_id INT PRIMARY KEY,
    like_enabled BIT DEFAULT 1,
    comment_enabled BIT DEFAULT 1,
    follow_enabled BIT DEFAULT 1,
    message_enabled BIT DEFAULT 1,
    group_message_enabled BIT DEFAULT 1,
    mention_enabled BIT DEFAULT 1,
    share_enabled BIT DEFAULT 1,
    push_enabled BIT DEFAULT 1,
    email_enabled BIT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | ✅ | Lấy danh sách notifications |
| PUT | `/api/notifications/{id}/read` | ✅ | Mark notification as read |
| PUT | `/api/notifications/read-all` | ✅ | Mark all as read |
| DELETE | `/api/notifications/{id}` | ✅ | Xóa notification |
| GET | `/api/notifications/settings` | ✅ | Lấy notification settings |
| PUT | `/api/notifications/settings` | ✅ | Cập nhật settings |

---

**📅 Last Updated:** December 14, 2025  
**📌 Version:** 1.0.0
