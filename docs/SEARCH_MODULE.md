# 🔍 TÀI LIỆU MODULE SEARCH

## 📋 Mục Lục
1. [Tổng quan](#tổng-quan)
2. [Search Users](#search-users)
3. [Search Posts](#search-posts)
4. [Priority Ranking](#priority-ranking)
5. [Search History](#search-history)

---

## 🎯 Tổng quan

### Search Features
- ✅ **Search Users** - Tìm users theo username, tên
- ✅ **Search Posts** - Tìm posts theo nội dung, hashtags
- ✅ **Priority Ranking** - Following > Messaged > Stranger
- ✅ **Search History** - Lưu lịch sử tìm kiếm
- ✅ **Real-time Suggestions** - Gợi ý khi gõ

### Priority Levels
1. 🟢 **Following** (Priority 3) - Đang follow
2. 🟡 **Messaged** (Priority 2) - Đã nhắn tin
3. ⚪ **Stranger** (Priority 1) - Người lạ

---

## 📝 Search Users

**Endpoint:** `GET /api/search/users`

**Auth:** Required (JWT)

**Query Parameters:**
```
?keyword={search_term}
&page=1
&pageSize=20
```

**Example:**
```http
GET /api/search/users?keyword=nguyen&page=1&pageSize=20
Authorization: Bearer {jwt_token}
```

**Priority Ranking Logic:**
```csharp
public async Task<List<UserSearchDto>> SearchUsersAsync(int currentUserId, string keyword)
{
    var users = await _context.Users
        .Where(u => 
            u.Username.Contains(keyword) || 
            u.FullName.Contains(keyword) ||
            u.Email.Contains(keyword)
        )
        .Select(u => new UserSearchDto
        {
            UserId = u.UserId,
            Username = u.Username,
            FullName = u.FullName,
            AvatarUrl = u.AvatarUrl,
            
            // Priority calculation
            Priority = 
                // Following = 3
                u.Followers.Any(f => f.FollowerId == currentUserId) ? 3 :
                // Messaged = 2
                u.ReceivedMessages.Any(m => m.SenderId == currentUserId) ||
                u.SentMessages.Any(m => m.ReceiverId == currentUserId) ? 2 :
                // Stranger = 1
                1,
            
            IsFollowing = u.Followers.Any(f => f.FollowerId == currentUserId),
            IsFollower = u.Following.Any(f => f.FollowedId == currentUserId),
            MutualFriendsCount = u.Followers
                .Count(f => currentUser.Following.Any(cf => cf.FollowedId == f.FollowerId))
        })
        .OrderByDescending(u => u.Priority)  // Ưu tiên cao nhất trước
        .ThenBy(u => u.Username)  // Rồi sort theo username
        .ToListAsync();
    
    return users;
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 10,
      "username": "nguyenvana",
      "full_name": "Nguyễn Văn A",
      "avatar_url": "http://localhost:5000/Assets/Images/avatar.jpg",
      "priority": 3,
      "priority_label": "Following",
      "is_following": true,
      "is_follower": true,
      "mutual_friends_count": 15
    },
    {
      "user_id": 15,
      "username": "nguyenthib",
      "full_name": "Nguyễn Thị B",
      "avatar_url": null,
      "priority": 2,
      "priority_label": "Messaged",
      "is_following": false,
      "is_follower": false,
      "mutual_friends_count": 3
    },
    {
      "user_id": 20,
      "username": "nguyenvanc",
      "full_name": "Nguyễn Văn C",
      "avatar_url": null,
      "priority": 1,
      "priority_label": "Stranger",
      "is_following": false,
      "is_follower": false,
      "mutual_friends_count": 0
    }
  ],
  "total": 127,
  "page": 1,
  "pageSize": 20
}
```

---

## 📝 Search Posts

**Endpoint:** `GET /api/search/posts`

**Auth:** Optional (better results if authenticated)

**Query Parameters:**
```
?keyword={search_term}
&page=1
&pageSize=20
&type=all  // all | images | videos | text
```

**Example:**
```http
GET /api/search/posts?keyword=travel&page=1&pageSize=20&type=all
Authorization: Bearer {jwt_token}
```

**Search Logic:**
```csharp
public async Task<List<PostSearchDto>> SearchPostsAsync(
    int? currentUserId, 
    string keyword, 
    string type = "all")
{
    var query = _context.Posts
        .Where(p => !p.IsDeleted)
        .Where(p => 
            // Search in caption
            p.Caption.Contains(keyword) ||
            // Search in hashtags
            p.Hashtags.Any(h => h.Tag.Contains(keyword)) ||
            // Search in comments
            p.Comments.Any(c => c.Content.Contains(keyword))
        );
    
    // Filter by type
    if (type == "images")
        query = query.Where(p => p.MediaType == "image");
    else if (type == "videos")
        query = query.Where(p => p.MediaType == "video");
    else if (type == "text")
        query = query.Where(p => string.IsNullOrEmpty(p.MediaUrl));
    
    // Privacy filter
    if (currentUserId.HasValue)
    {
        query = query.Where(p =>
            // Public posts
            p.PrivacySetting == "public" ||
            // User's own posts
            p.UserId == currentUserId.Value ||
            // Friends' posts (if privacy = friends)
            (p.PrivacySetting == "friends" && 
             p.User.Followers.Any(f => f.FollowerId == currentUserId.Value))
        );
    }
    else
    {
        // Unauthenticated: only public posts
        query = query.Where(p => p.PrivacySetting == "public");
    }
    
    var posts = await query
        .OrderByDescending(p => p.CreatedAt)
        .Select(p => new PostSearchDto
        {
            PostId = p.PostId,
            UserId = p.UserId,
            Username = p.User.Username,
            UserAvatar = p.User.AvatarUrl,
            Caption = p.Caption,
            MediaUrl = p.MediaUrl,
            MediaType = p.MediaType,
            LikesCount = p.Reactions.Count(r => r.ReactionType == "Like"),
            CommentsCount = p.Comments.Count,
            SharesCount = p.Shares.Count,
            CreatedAt = p.CreatedAt
        })
        .ToListAsync();
    
    return posts;
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "post_id": 123,
      "user_id": 10,
      "username": "nguyenvana",
      "user_avatar": "http://localhost:5000/Assets/Images/avatar.jpg",
      "caption": "Amazing travel to Paris 🗼 #travel #paris",
      "media_url": "http://localhost:5000/Assets/Images/post123.jpg",
      "media_type": "image",
      "likes_count": 245,
      "comments_count": 34,
      "shares_count": 12,
      "created_at": "2025-12-14T10:00:00Z"
    }
  ],
  "total": 89,
  "page": 1,
  "pageSize": 20
}
```

---

## 📝 Search History

### Save Search

**Endpoint:** `POST /api/search/history`

**Auth:** Required (JWT)

**Request Body:**
```json
{
  "keyword": "nguyen",
  "searchType": "user"  // user | post
}
```

**Logic:**
```csharp
1. Check if keyword already exists in history
2. If exists: Update searched_at to now
3. If not exists: Create new record
4. Keep only last 20 searches per user
5. Return success
```

### Get Search History

**Endpoint:** `GET /api/search/history`

**Auth:** Required (JWT)

**Response:**
```json
{
  "data": [
    {
      "keyword": "nguyen",
      "search_type": "user",
      "searched_at": "2025-12-14T11:00:00Z"
    },
    {
      "keyword": "travel",
      "search_type": "post",
      "searched_at": "2025-12-14T10:30:00Z"
    }
  ]
}
```

### Clear Search History

**Endpoint:** `DELETE /api/search/history`

**Auth:** Required (JWT)

**Description:** Xóa toàn bộ lịch sử tìm kiếm

---

## 📝 Search Suggestions

**Endpoint:** `GET /api/search/suggestions`

**Auth:** Optional

**Query Parameters:**
```
?keyword={partial_keyword}
&type=user  // user | post | hashtag
```

**Example:**
```http
GET /api/search/suggestions?keyword=ngu&type=user
```

**Logic:**
```csharp
// Auto-complete suggestions
public async Task<List<string>> GetSuggestionsAsync(string keyword, string type)
{
    if (type == "user")
    {
        return await _context.Users
            .Where(u => u.Username.StartsWith(keyword))
            .Select(u => u.Username)
            .Take(10)
            .ToListAsync();
    }
    else if (type == "hashtag")
    {
        return await _context.Hashtags
            .Where(h => h.Tag.StartsWith(keyword))
            .OrderByDescending(h => h.PostsCount)  // Popular hashtags first
            .Select(h => h.Tag)
            .Take(10)
            .ToListAsync();
    }
    
    return new List<string>();
}
```

**Response:**
```json
{
  "suggestions": [
    "nguyenvana",
    "nguyenthib",
    "nguyenvanc"
  ]
}
```

---

## 📊 Priority Ranking Details

### User Search Priority Algorithm

```csharp
public int CalculateUserPriority(User user, int currentUserId)
{
    // Priority 3: Following
    bool isFollowing = user.Followers
        .Any(f => f.FollowerId == currentUserId);
    if (isFollowing) return 3;
    
    // Priority 2: Messaged
    bool hasMessaged = user.ReceivedMessages
        .Any(m => m.SenderId == currentUserId) ||
        user.SentMessages
        .Any(m => m.ReceiverId == currentUserId);
    if (hasMessaged) return 2;
    
    // Priority 1: Stranger (default)
    return 1;
}
```

### Post Search Ranking

Posts được rank theo:
1. **Relevance** - Số lần keyword xuất hiện
2. **Engagement** - Likes + Comments + Shares
3. **Recency** - Posts mới hơn rank cao hơn

```csharp
public double CalculatePostScore(Post post, string keyword)
{
    // Count keyword occurrences
    int relevance = CountKeywordOccurrences(post.Caption, keyword);
    
    // Engagement score
    int engagement = post.Reactions.Count + 
                    post.Comments.Count * 2 +  // Comments worth more
                    post.Shares.Count * 3;      // Shares worth most
    
    // Recency score (newer = higher)
    var daysSincePosted = (DateTime.UtcNow - post.CreatedAt).TotalDays;
    double recency = Math.Max(0, 100 - daysSincePosted);
    
    // Combined score
    return (relevance * 10) + (engagement * 0.1) + recency;
}
```

---

## 📊 Database Schema

### SearchHistory Table
```sql
CREATE TABLE SearchHistory (
    search_id INT PRIMARY KEY IDENTITY,
    user_id INT NOT NULL,
    keyword NVARCHAR(200) NOT NULL,
    search_type VARCHAR(20) NOT NULL,  -- user | post | hashtag
    searched_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_user_searched (user_id, searched_at DESC)
);
```

### Hashtags Table
```sql
CREATE TABLE Hashtags (
    hashtag_id INT PRIMARY KEY IDENTITY,
    tag NVARCHAR(100) UNIQUE NOT NULL,
    posts_count INT DEFAULT 0,
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    INDEX idx_tag (tag),
    INDEX idx_posts_count (posts_count DESC)
);

CREATE TABLE PostHashtags (
    post_id INT NOT NULL,
    hashtag_id INT NOT NULL,
    PRIMARY KEY (post_id, hashtag_id),
    FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (hashtag_id) REFERENCES Hashtags(hashtag_id)
);
```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/search/users` | ✅ | Tìm users với priority |
| GET | `/api/search/posts` | ❌ | Tìm posts theo keyword |
| POST | `/api/search/history` | ✅ | Lưu search history |
| GET | `/api/search/history` | ✅ | Lấy search history |
| DELETE | `/api/search/history` | ✅ | Xóa search history |
| GET | `/api/search/suggestions` | ❌ | Auto-complete suggestions |

---

## 🎨 Frontend Integration

### Search Users with Priority Display

```javascript
async function searchUsers(keyword) {
  const response = await fetch(
    `http://localhost:5000/api/search/users?keyword=${encodeURIComponent(keyword)}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );

  const result = await response.json();
  
  // Group by priority
  const grouped = {
    following: result.data.filter(u => u.priority === 3),
    messaged: result.data.filter(u => u.priority === 2),
    others: result.data.filter(u => u.priority === 1)
  };
  
  // Render with sections
  renderUserResults(grouped);
}

function renderUserResults(grouped) {
  let html = '';
  
  if (grouped.following.length > 0) {
    html += '<h3>🟢 Following</h3>';
    html += renderUserList(grouped.following);
  }
  
  if (grouped.messaged.length > 0) {
    html += '<h3>🟡 Messaged</h3>';
    html += renderUserList(grouped.messaged);
  }
  
  if (grouped.others.length > 0) {
    html += '<h3>⚪ Others</h3>';
    html += renderUserList(grouped.others);
  }
  
  document.getElementById('searchResults').innerHTML = html;
}
```

### Real-time Search Suggestions

```javascript
let debounceTimer;

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(async () => {
    const keyword = e.target.value;
    if (keyword.length < 2) return;
    
    const response = await fetch(
      `http://localhost:5000/api/search/suggestions?keyword=${keyword}&type=user`
    );
    const result = await response.json();
    
    // Show suggestions dropdown
    showSuggestions(result.suggestions);
  }, 300);  // Wait 300ms after user stops typing
});
```

---

**📅 Last Updated:** December 14, 2025  
**📌 Version:** 1.0.0
