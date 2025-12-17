# 💬💖📤 TÀI LIỆU MODULE COMMENTS, REACTIONS & SHARES

## 📋 Mục Lục
1. [Comments - Bình luận](#comments---bình-luận)
2. [Reactions - Cảm xúc](#reactions---cảm-xúc)
3. [Shares - Chia sẻ](#shares---chia-sẻ)

---

## 💬 COMMENTS - Bình luận

### 🎯 Tổng quan

- ✅ Nested comments (replies)
- ✅ Reactions on comments (Like, Love, etc.)
- ✅ Mentions trong comments (@username)
- ✅ Edit history (track edits)
- ✅ AI Moderation - PhoBERT toxic detection
- ✅ Auto-delete toxic comments sau 6 giây
- ✅ Real-time với SignalR CommentHub

### 📝 Create Comment

**Endpoint:** `POST /api/comments`

**Auth:** Required (JWT)

**Request Body:**
```json
{
  "postId": 123,
  "content": "Great photo! @nguyenvana 👍",
  "parentCommentId": null  // null = top-level, có giá trị = reply
}
```

**AI Moderation Flow:**
```csharp
1. Gửi content đến PhoBERT ML Service
2. Phân tích: clean | toxic | spam | hate_speech
3. Nếu high_risk (toxic):
   - Lưu comment với is_toxic = true
   - Gửi warning notification cho user
   - Sau 6 giây: Auto-delete comment
   - Admin được notify để review
4. Nếu low_risk:
   - Lưu comment bình thường
5. Real-time broadcast: "CommentAdded"
```

**Response:**
```json
{
  "commentId": 456,
  "userId": 5,
  "accountId": 3,
  "username": "nguyenvana",
  "userAvatar": "http://localhost:5000/Assets/Images/avatar.jpg",
  "content": "Great photo! @nguyenvana 👍",
  "parentCommentId": null,
  "createdAt": "2025-12-14T11:00:00Z",
  "isEdited": false,
  "likesCount": 0
}
```

### 📝 Get Comments

**Endpoint:** `GET /api/comments/{postId}?page=1&pageSize=20`

**Auth:** Optional

**Response:**
```json
{
  "comments": [
    {
      "commentId": 456,
      "content": "Great photo!",
      "createdAt": "2025-12-14T11:00:00Z",
      "userId": 5,
      "username": "nguyenvana",
      "userAvatar": "http://localhost:5000/Assets/Images/avatar.jpg",
      "parentCommentId": null,
      "likesCount": 15,
      "isLiked": false,
      "isEdited": false
    },
    {
      "commentId": 457,
      "content": "Thanks! 😊",
      "createdAt": "2025-12-14T11:05:00Z",
      "userId": 10,
      "username": "tranthib",
      "userAvatar": null,
      "parentCommentId": 456,  // Reply to comment 456
      "likesCount": 5,
      "isLiked": true,
      "isEdited": false
    }
  ],
  "total": 87,
  "page": 1,
  "pageSize": 20
}
```

### 📝 Get Replies

**Endpoint:** `GET /api/comments/{commentId}/replies`

**Auth:** Optional

**Description:** Lấy tất cả replies của 1 comment cụ thể

### 📝 Update Comment

**Endpoint:** `PUT /api/comments/{commentId}`

**Auth:** Required (JWT - chỉ author)

**Request Body:**
```json
{
  "content": "Updated content"
}
```

**Logic:**
```csharp
1. Verify ownership (chỉ author mới edit được)
2. Lưu edit history
3. Update content
4. Set is_edited = true
5. Re-check với AI Moderation
6. Real-time broadcast: "CommentUpdated"
```

### 📝 Delete Comment

**Endpoint:** `DELETE /api/comments/{commentId}`

**Auth:** Required (JWT - author hoặc post owner)

**Logic:**
```csharp
1. Kiểm tra quyền:
   - Comment author → OK
   - Post owner → OK
   - Admin → OK
2. Soft delete: is_deleted = true
3. Xóa tất cả replies (cascade)
4. Real-time broadcast: "CommentDeleted"
```

### 📝 React to Comment

**Endpoint:** `POST /api/comments/{commentId}/react`

**Auth:** Required (JWT)

**Request Body:**
```json
{
  "reactionType": "Like"  // Like | Love | Haha | Wow | Sad | Angry
}
```

**Response:**
```json
{
  "message": "Reacted successfully",
  "reactions": {
    "Like": 10,
    "Love": 3,
    "total": 13
  }
}
```

### 🤖 AI Moderation - Auto-delete Toxic Comments

**Background Service:**
```csharp
public class CommentModerationService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Mỗi 10 giây check 1 lần
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            
            // Tìm comments toxic chưa bị xóa
            var toxicComments = await _commentRepo
                .GetToxicCommentsAsync();
            
            foreach (var comment in toxicComments)
            {
                // Nếu đã quá 6 giây kể từ created_at
                if (DateTime.UtcNow - comment.CreatedAt > TimeSpan.FromSeconds(6))
                {
                    // Auto-delete
                    await _commentService.DeleteCommentAsync(comment.CommentId);
                    
                    // Notify admin
                    await _notificationService.NotifyAdminAsync(
                        $"Toxic comment deleted: {comment.Content}"
                    );
                }
            }
        }
    }
}
```

**SignalR Events:**
```javascript
// Comment added
connection.on('CommentAdded', (data) => {
  addCommentToUI(data);
});

// Comment reply added
connection.on('CommentReplyAdded', (data) => {
  addReplyToComment(data.parentCommentId, data);
});

// Comment deleted (auto or manual)
connection.on('CommentDeleted', (data) => {
  removeCommentFromUI(data.commentId);
  if (data.reason === 'toxic') {
    showWarning('Your comment was removed for violating community guidelines');
  }
});
```

---

## 💖 REACTIONS - Cảm xúc

### 🎯 Reaction Types

- 👍 **Like** - Thích
- ❤️ **Love** - Yêu thích
- 😂 **Haha** - Hài hước
- 😮 **Wow** - Ngạc nhiên
- 😢 **Sad** - Buồn
- 😡 **Angry** - Tức giận

### 📝 Add/Update Reaction

**Endpoint:** `POST /api/reactions`

**Auth:** Required (JWT)

**Request Body:**
```json
{
  "postId": 123,
  "reactionType": "Love"
}
```

**Logic:**
```csharp
1. Tìm reaction cũ của user cho post
2. Nếu cùng type → Xóa reaction (unlike)
3. Nếu khác type → Update sang type mới
4. Nếu chưa có → Tạo reaction mới
5. Update reaction counts trên Post
6. Gửi notification cho post owner
7. Return reaction DTO
```

**Response:**
```json
{
  "message": "Thả cảm xúc thành công",
  "data": {
    "user_id": 5,
    "post_id": 123,
    "reaction_type": "Love",
    "created_at": "2025-12-14T11:10:00Z"
  }
}
```

### 📝 Get Reaction Summary

**Endpoint:** `GET /api/reactions/post/{postId}/summary`

**Auth:** Optional

**Response:**
```json
{
  "data": {
    "Like": 150,
    "Love": 45,
    "Haha": 12,
    "Wow": 8,
    "Sad": 2,
    "Angry": 1,
    "total": 218,
    "current_user_reaction": "Love"  // null nếu chưa react
  }
}
```

### 📝 Get Reactions Details

**Endpoint:** `GET /api/reactions/post/{postId}`

**Auth:** Optional

**Response:**
```json
{
  "data": [
    {
      "user_id": 5,
      "username": "nguyenvana",
      "full_name": "Nguyễn Văn A",
      "avatar_url": "http://localhost:5000/Assets/Images/avatar.jpg",
      "reaction_type": "Love",
      "created_at": "2025-12-14T11:10:00Z"
    }
  ]
}
```

---

## 📤 SHARES - Chia sẻ

### 🎯 Share Types

- **Share to Feed** - Chia sẻ lên feed của mình
- **Share to Story** - Chia sẻ lên story (future feature)
- **Share via Message** - Gửi qua chat

### 📝 Share Post

**Endpoint:** `POST /api/shares`

**Auth:** Required (JWT)

**Request Body:**
```json
{
  "postId": 123,
  "message": "Check this out! 🔥",  // Optional caption
  "shareType": "feed"  // feed | story | message
}
```

**Logic:**
```csharp
1. Kiểm tra quyền xem original post:
   - public → OK
   - private → Chỉ friends
   - followers → Chỉ followers
2. Tạo Share record
3. Tạo Post mới (share post):
   - caption = message
   - Ref link về original post
   - Giữ nguyên media từ original
4. Gửi notification cho original post owner
5. Update shares_count trên original post
6. Return share DTO
```

**Response:**
```json
{
  "message": "Chia sẻ thành công",
  "data": {
    "share_id": 789,
    "post_id": 123,
    "shared_by_user_id": 5,
    "message": "Check this out! 🔥",
    "created_at": "2025-12-14T11:15:00Z",
    "new_post_id": 456  // ID của post mới được tạo
  }
}
```

### 📝 Get Shares

**Endpoint:** `GET /api/shares/post/{postId}`

**Auth:** Optional

**Response:**
```json
{
  "data": [
    {
      "share_id": 789,
      "user_id": 5,
      "username": "nguyenvana",
      "full_name": "Nguyễn Văn A",
      "avatar_url": "http://localhost:5000/Assets/Images/avatar.jpg",
      "message": "Check this out! 🔥",
      "shared_at": "2025-12-14T11:15:00Z"
    }
  ],
  "total": 45
}
```

### 📝 Delete Share

**Endpoint:** `DELETE /api/shares/{shareId}`

**Auth:** Required (JWT - chỉ sharer)

**Logic:**
```csharp
1. Verify ownership
2. Xóa Share record
3. Xóa shared post (nếu có)
4. Giảm shares_count trên original post
5. Return success
```

---

## 📡 API Endpoints Summary

### Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/comments` | ✅ | Tạo comment |
| GET | `/api/comments/{postId}` | ❌ | Lấy comments của post |
| GET | `/api/comments/{commentId}/replies` | ❌ | Lấy replies |
| PUT | `/api/comments/{commentId}` | ✅ | Sửa comment |
| DELETE | `/api/comments/{commentId}` | ✅ | Xóa comment |
| POST | `/api/comments/{commentId}/react` | ✅ | React to comment |

### Reactions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reactions` | ✅ | Thêm/Đổi reaction |
| GET | `/api/reactions/post/{postId}/summary` | ❌ | Lấy tổng hợp reactions |
| GET | `/api/reactions/post/{postId}` | ❌ | Lấy chi tiết reactions |

### Shares

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/shares` | ✅ | Chia sẻ post |
| GET | `/api/shares/post/{postId}` | ❌ | Xem danh sách shares |
| DELETE | `/api/shares/{shareId}` | ✅ | Xóa share |

---

## 📊 Database Schema

### Comments Table
```sql
CREATE TABLE Comments (
    comment_id INT PRIMARY KEY IDENTITY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    content NVARCHAR(2000) NOT NULL,
    parent_comment_id INT,  -- NULL = top-level, có giá trị = reply
    is_edited BIT DEFAULT 0,
    is_deleted BIT DEFAULT 0,
    is_toxic BIT DEFAULT 0,  -- PhoBERT AI detection
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    updated_at DATETIMEOFFSET,
    FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (parent_comment_id) REFERENCES Comments(comment_id)
);
```

### CommentReactions Table
```sql
CREATE TABLE CommentReactions (
    reaction_id INT PRIMARY KEY IDENTITY,
    comment_id INT NOT NULL,
    user_id INT NOT NULL,
    reaction_type VARCHAR(20) NOT NULL,  -- Like | Love | Haha | Wow | Sad | Angry
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    FOREIGN KEY (comment_id) REFERENCES Comments(comment_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    UNIQUE (comment_id, user_id)
);
```

### Reactions Table
```sql
CREATE TABLE Reactions (
    reaction_id INT PRIMARY KEY IDENTITY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    reaction_type VARCHAR(20) NOT NULL,
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    UNIQUE (post_id, user_id)
);
```

### Shares Table
```sql
CREATE TABLE Shares (
    share_id INT PRIMARY KEY IDENTITY,
    post_id INT NOT NULL,
    shared_by_user_id INT NOT NULL,
    message NVARCHAR(500),
    share_type VARCHAR(20) DEFAULT 'feed',  -- feed | story | message
    new_post_id INT,  -- ID của post mới được tạo
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    FOREIGN KEY (post_id) REFERENCES Posts(post_id),
    FOREIGN KEY (shared_by_user_id) REFERENCES Users(user_id),
    FOREIGN KEY (new_post_id) REFERENCES Posts(post_id)
);
```

---

**📅 Last Updated:** December 14, 2025  
**📌 Version:** 1.0.0
