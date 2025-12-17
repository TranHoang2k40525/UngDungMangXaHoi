# 📷⏰ TÀI LIỆU MODULE STORIES

## 📋 Mục Lục
1. [Tổng quan](#tổng-quan)
2. [Create Story](#create-story)
3. [Get Stories](#get-stories)
4. [View Story](#view-story)
5. [Delete Story](#delete-story)
6. [Background Services](#background-services)

---

## 🎯 Tổng quan

### Story Features
- ✅ **24-hour expiration** - Tự động xóa sau 24h
- ✅ **Cloudinary storage** - Upload ảnh/video lên cloud
- ✅ **View tracking** - Theo dõi ai đã xem
- ✅ **Background cleanup** - Tự động xóa stories hết hạn
- ✅ **Privacy settings** - Public/Private/Friends only

### Story Types
- 📸 **Photo Story** - Ảnh tĩnh (JPG, PNG)
- 🎬 **Video Story** - Video ngắn (MP4, max 30s)
- 📝 **Text Story** - Chỉ text (future feature)

---

## 📝 Create Story

**Endpoint:** `POST /api/stories`

**Auth:** Required (JWT)

**Request:** Multipart/form-data

```http
POST /api/stories HTTP/1.1
Host: localhost:5000
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="story.jpg"
Content-Type: image/jpeg

[binary data]
------WebKitFormBoundary
Content-Disposition: form-data; name="caption"

Beautiful sunset 🌅
------WebKitFormBoundary
Content-Disposition: form-data; name="privacySetting"

public
------WebKitFormBoundary--
```

**C# DTO:**
```csharp
public class CreateStoryDto
{
    [Required]
    public IFormFile File { get; set; }  // Image/Video file
    
    [MaxLength(500)]
    public string? Caption { get; set; }
    
    public string PrivacySetting { get; set; } = "public";  // public | friends | private
}
```

**Logic Flow:**
```csharp
1. Validate file:
   - Type: image/jpeg, image/png, video/mp4
   - Size: max 50MB cho video, 10MB cho ảnh
   - Duration (video): max 30s
   
2. Upload lên Cloudinary:
   var uploadParams = new ImageUploadParams()
   {
       File = new FileDescription(file.FileName, stream),
       Folder = "stories",
       Transformation = new Transformation()
           .Width(1080).Height(1920).Crop("fill")  // Tự động resize 9:16
   };
   
3. Lưu vào database:
   - story_id
   - user_id
   - media_url (Cloudinary URL)
   - media_type (image | video)
   - caption
   - privacy_setting
   - created_at
   - expires_at = created_at + 24 hours
   
4. Return story DTO
```

**Response:**
```json
{
  "success": true,
  "message": "Story created successfully",
  "data": {
    "story_id": 123,
    "user_id": 5,
    "username": "nguyenvana",
    "user_avatar": "http://localhost:5000/Assets/Images/avatar.jpg",
    "media_url": "https://res.cloudinary.com/demo/image/upload/v1234/stories/story.jpg",
    "media_type": "image",
    "caption": "Beautiful sunset 🌅",
    "privacy_setting": "public",
    "created_at": "2025-12-14T10:00:00Z",
    "expires_at": "2025-12-15T10:00:00Z",
    "views_count": 0
  }
}
```

---

## 📝 Get Stories

### Get Feed Stories (Following Users)

**Endpoint:** `GET /api/stories/feed`

**Auth:** Required (JWT)

**Description:** Lấy stories của những người mình follow, sắp xếp theo thời gian mới nhất

**Response:**
```json
{
  "data": [
    {
      "user_id": 10,
      "username": "tranthib",
      "user_avatar": "http://localhost:5000/Assets/Images/avatar2.jpg",
      "stories": [
        {
          "story_id": 125,
          "media_url": "https://res.cloudinary.com/demo/image/upload/v1234/stories/story1.jpg",
          "media_type": "image",
          "caption": "Good morning! ☀️",
          "created_at": "2025-12-14T08:00:00Z",
          "expires_at": "2025-12-15T08:00:00Z",
          "is_viewed": false
        },
        {
          "story_id": 126,
          "media_url": "https://res.cloudinary.com/demo/video/upload/v1234/stories/story2.mp4",
          "media_type": "video",
          "caption": null,
          "created_at": "2025-12-14T09:00:00Z",
          "expires_at": "2025-12-15T09:00:00Z",
          "is_viewed": true
        }
      ],
      "total_stories": 2,
      "unviewed_count": 1
    }
  ]
}
```

### Get User Stories

**Endpoint:** `GET /api/stories/user/{userId}`

**Auth:** Required (JWT)

**Description:** Lấy tất cả stories của 1 user cụ thể

**Privacy Logic:**
```csharp
1. Nếu là chính mình → Show all
2. Nếu story là public → Show
3. Nếu story là friends → Kiểm tra friendship
4. Nếu story là private → Hide
```

**Response:**
```json
{
  "data": {
    "user_id": 5,
    "username": "nguyenvana",
    "user_avatar": "http://localhost:5000/Assets/Images/avatar.jpg",
    "stories": [
      {
        "story_id": 123,
        "media_url": "https://res.cloudinary.com/demo/image/upload/v1234/stories/story.jpg",
        "media_type": "image",
        "caption": "Beautiful sunset 🌅",
        "created_at": "2025-12-14T10:00:00Z",
        "expires_at": "2025-12-15T10:00:00Z",
        "views_count": 45,
        "is_viewed": true
      }
    ],
    "total_stories": 1
  }
}
```

---

## 📝 View Story

**Endpoint:** `POST /api/stories/{storyId}/view`

**Auth:** Required (JWT)

**Description:** Mark story as viewed, tăng view count

**Logic:**
```csharp
1. Kiểm tra xem đã view chưa
2. Nếu chưa:
   - Tạo StoryView record
   - Tăng views_count
3. Return success
```

**Request:** Empty body

**Response:**
```json
{
  "success": true,
  "message": "Story viewed",
  "data": {
    "story_id": 123,
    "views_count": 46
  }
}
```

### Get Story Viewers

**Endpoint:** `GET /api/stories/{storyId}/viewers`

**Auth:** Required (JWT - chỉ story owner)

**Description:** Xem danh sách người đã xem story của mình

**Response:**
```json
{
  "data": [
    {
      "user_id": 10,
      "username": "tranthib",
      "full_name": "Trần Thị B",
      "avatar_url": "http://localhost:5000/Assets/Images/avatar2.jpg",
      "viewed_at": "2025-12-14T10:30:00Z"
    },
    {
      "user_id": 15,
      "username": "levanc",
      "full_name": "Lê Văn C",
      "avatar_url": null,
      "viewed_at": "2025-12-14T11:00:00Z"
    }
  ],
  "total": 45
}
```

---

## 📝 Delete Story

**Endpoint:** `DELETE /api/stories/{storyId}`

**Auth:** Required (JWT - chỉ story owner)

**Logic:**
```csharp
1. Verify ownership
2. Xóa file trên Cloudinary:
   var deletionParams = new DeletionParams(publicId);
   await cloudinary.DestroyAsync(deletionParams);
3. Xóa StoryViews records
4. Xóa Story record
5. Return success
```

**Response:**
```json
{
  "success": true,
  "message": "Story deleted successfully"
}
```

---

## 🔄 Background Services

### Auto-delete Expired Stories

**Service:** `StoryCleanupService`

```csharp
public class StoryCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<StoryCleanupService> _logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Story Cleanup Service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Chạy mỗi 1 giờ
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);

                using var scope = _serviceProvider.CreateScope();
                var storyRepo = scope.ServiceProvider
                    .GetRequiredService<IStoryRepository>();
                var cloudinary = scope.ServiceProvider
                    .GetRequiredService<Cloudinary>();

                // Tìm stories đã hết hạn (expires_at < now)
                var expiredStories = await storyRepo
                    .GetExpiredStoriesAsync();

                foreach (var story in expiredStories)
                {
                    try
                    {
                        // Xóa file trên Cloudinary
                        var publicId = ExtractPublicId(story.MediaUrl);
                        if (!string.IsNullOrEmpty(publicId))
                        {
                            var deletionParams = new DeletionParams(publicId)
                            {
                                ResourceType = story.MediaType == "video" 
                                    ? ResourceType.Video 
                                    : ResourceType.Image
                            };
                            await cloudinary.DestroyAsync(deletionParams);
                        }

                        // Xóa từ database
                        await storyRepo.DeleteStoryAsync(story.StoryId);

                        _logger.LogInformation(
                            $"Deleted expired story {story.StoryId} from user {story.UserId}"
                        );
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, 
                            $"Error deleting story {story.StoryId}");
                    }
                }

                if (expiredStories.Count > 0)
                {
                    _logger.LogInformation(
                        $"Cleanup completed: {expiredStories.Count} stories deleted"
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Story Cleanup Service");
            }
        }
    }

    private string ExtractPublicId(string cloudinaryUrl)
    {
        // Extract public_id from Cloudinary URL
        // Example: https://res.cloudinary.com/demo/image/upload/v1234/stories/story.jpg
        // → stories/story
        var uri = new Uri(cloudinaryUrl);
        var segments = uri.Segments;
        var uploadIndex = Array.IndexOf(segments, "upload/");
        if (uploadIndex >= 0 && uploadIndex + 2 < segments.Length)
        {
            var publicId = string.Join("", segments.Skip(uploadIndex + 2));
            return publicId.Replace("/", "").Replace(".jpg", "").Replace(".mp4", "");
        }
        return null;
    }
}
```

### Startup Registration

```csharp
// Program.cs
builder.Services.AddHostedService<StoryCleanupService>();
```

---

## 📊 Database Schema

```sql
CREATE TABLE Stories (
    story_id INT PRIMARY KEY IDENTITY,
    user_id INT NOT NULL,
    media_url NVARCHAR(500) NOT NULL,  -- Cloudinary URL
    media_type VARCHAR(20) NOT NULL,   -- image | video
    caption NVARCHAR(500),
    privacy_setting VARCHAR(20) DEFAULT 'public',  -- public | friends | private
    views_count INT DEFAULT 0,
    created_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    expires_at DATETIMEOFFSET NOT NULL,  -- created_at + 24 hours
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_user_expires (user_id, expires_at),
    INDEX idx_expires_at (expires_at)  -- For cleanup service
);

CREATE TABLE StoryViews (
    view_id INT PRIMARY KEY IDENTITY,
    story_id INT NOT NULL,
    viewer_user_id INT NOT NULL,
    viewed_at DATETIMEOFFSET DEFAULT GETUTCDATE(),
    FOREIGN KEY (story_id) REFERENCES Stories(story_id) ON DELETE CASCADE,
    FOREIGN KEY (viewer_user_id) REFERENCES Users(user_id),
    UNIQUE (story_id, viewer_user_id)  -- 1 user chỉ view 1 lần
);
```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/stories` | ✅ | Tạo story mới |
| GET | `/api/stories/feed` | ✅ | Lấy stories của following users |
| GET | `/api/stories/user/{userId}` | ✅ | Lấy stories của 1 user |
| POST | `/api/stories/{storyId}/view` | ✅ | Mark story as viewed |
| GET | `/api/stories/{storyId}/viewers` | ✅ | Xem danh sách viewers |
| DELETE | `/api/stories/{storyId}` | ✅ | Xóa story |

---

## 🎨 Frontend Integration

### Upload Story

```javascript
async function uploadStory(file, caption, privacySetting = 'public') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('caption', caption);
  formData.append('privacySetting', privacySetting);

  const response = await fetch('http://localhost:5000/api/stories', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });

  if (response.ok) {
    const result = await response.json();
    console.log('Story created:', result.data);
    return result.data;
  } else {
    throw new Error('Failed to create story');
  }
}

// Usage
const fileInput = document.getElementById('storyFile');
uploadStory(fileInput.files[0], 'My new story! 📸', 'public');
```

### View Story

```javascript
async function viewStory(storyId) {
  const response = await fetch(`http://localhost:5000/api/stories/${storyId}/view`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (response.ok) {
    const result = await response.json();
    console.log('Story viewed, total views:', result.data.views_count);
  }
}
```

---

**📅 Last Updated:** December 14, 2025  
**📌 Version:** 1.0.0
