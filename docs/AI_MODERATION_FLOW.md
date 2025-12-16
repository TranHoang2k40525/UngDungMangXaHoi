# 🤖 LUỒNG XỬ LÝ AI MODERATION - PHOBEET TOXIC FILTER

## 📋 Tổng Quan

Hệ thống sử dụng **PhoBERT** (Vietnamese BERT) để phát hiện nội dung toxic trong comments và post captions. Luồng xử lý gồm 2 phần:
1. **Python ML Service** (FastAPI) - Chạy mô hình AI
2. **C# Backend** - Tích hợp và xử lý logic

---

## 🐍 1. PYTHON ML SERVICE (MLService/app.py)

### Endpoint chính
```
POST http://127.0.0.1:8000/moderate
```

### Request
```json
{
  "text": "Nội dung cần kiểm tra"
}
```

### Response
```json
{
  "is_safe": false,
  "label": "toxic",
  "confidence": 0.87,
  "risk_level": "high_risk",
  "cumulative_negative": 0.92,
  "all_scores": {
    "safe": 0.08,
    "toxic": 0.65,
    "hate": 0.15,
    "violence": 0.08,
    "nsfw": 0.03,
    "suicide": 0.01
  }
}
```

### Các Labels
- ✅ **safe** - Nội dung an toàn
- ⚠️ **toxic** - Nội dung toxic chung
- 🚫 **hate** - Ngôn từ thù hận
- 💥 **violence** - Bạo lực
- 🔞 **nsfw** - Nội dung người lớn
- ☠️ **suicide** - Tự tử/tự hại

### Risk Levels
- 🟢 **no_risk** - Không rủi ro (safe)
- 🟡 **low_risk** - Rủi ro thấp (confidence < 0.80)
- 🟠 **medium_risk** - Rủi ro trung bình (confidence > 0.80)
- 🔴 **high_risk** - Rủi ro cao (suicide, violence, nsfw, hate, toxic)

### Thresholds (Ngưỡng)
```python
SMART_THRESHOLDS = {
    'suicide': 0.35,
    'violence': 0.40,
    'nsfw': 0.50,
    'toxic': 0.60,
    'hate': 0.70,
    'safe': 0.30
}
CUMULATIVE_THRESHOLD = 0.60
```

---

## 🔧 2. C# BACKEND - INFRASTRUCTURE LAYER

### 2.1. Service Interface
**File:** `Domain/Interfaces/IContentModerationService.cs`

```csharp
public interface IContentModerationService
{
    Task<ModerationResult> AnalyzeTextAsync(string text);
}

public class ModerationResult
{
    public bool IsSafe { get; set; }
    public string Label { get; set; }
    public double Confidence { get; set; }
    public string RiskLevel { get; set; }
    public double CumulativeNegative { get; set; }
    public Dictionary<string, double> AllScores { get; set; }
}
```

### 2.2. Service Implementation
**File:** `Infrastructure/ExternalServices/PhoBertModerationService.cs`

```csharp
public class PhoBertModerationService : IContentModerationService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiUrl; // http://127.0.0.1:8000

    public async Task<ModerationResult> AnalyzeTextAsync(string text)
    {
        // Gửi request đến Python ML Service
        var request = new { text };
        var response = await _httpClient.PostAsync($"{_apiUrl}/moderate", content);
        
        // Parse response và map sang ModerationResult
        // Nếu ML Service không khả dụng → return IsSafe = true (failsafe)
    }
}
```

**Đăng ký trong Program.cs:**
```csharp
var mlApiUrl = builder.Configuration["MLService:ApiUrl"] ?? "http://127.0.0.1:8000";
builder.Services.AddHttpClient<IContentModerationService, PhoBertModerationService>()
    .AddTypedClient<IContentModerationService>(client => 
        new PhoBertModerationService(client, mlApiUrl));
```

### 2.3. Database Entity
**File:** `Domain/Entities/ContentModeration.cs`

```csharp
public class ContentModeration
{
    public int ModerationID { get; set; }
    public string ContentType { get; set; }  // "Post" | "Comment"
    public int ContentID { get; set; }
    public int AccountId { get; set; }
    public int? PostId { get; set; }
    public int? CommentId { get; set; }
    public double AIConfidence { get; set; }
    public string ToxicLabel { get; set; }  // safe | toxic | hate | violence | nsfw | suicide
    public string Status { get; set; }  // pending | approved | blocked
    public DateTime? CreatedAt { get; set; }
    
    // Navigation properties
    public Post? Post { get; set; }
    public Comment? Comment { get; set; }
    public Account Account { get; set; }
}
```

**Database Table:**
```sql
CREATE TABLE ContentModeration (
    ModerationID INT PRIMARY KEY IDENTITY,
    ContentType VARCHAR(20) NOT NULL,  -- Post | Comment
    ContentID INT NOT NULL,
    account_id INT NOT NULL,
    post_id INT NULL,
    comment_id INT NULL,
    AIConfidence FLOAT NOT NULL,
    ToxicLabel VARCHAR(50) NOT NULL,  -- safe | toxic | hate | violence | nsfw | suicide
    Status VARCHAR(20) NOT NULL,  -- pending | approved | blocked
    CreatedAt DATETIME2,
    FOREIGN KEY (account_id) REFERENCES Accounts(account_id),
    FOREIGN KEY (post_id) REFERENCES Posts(post_id),
    FOREIGN KEY (comment_id) REFERENCES Comments(comment_id)
);
```

### 2.4. Repository
**File:** `Infrastructure/Repositories/ContentModerationRepository.cs`

```csharp
public class ContentModerationRepository : IContentModerationRepository
{
    public async Task<ContentModeration> CreateAsync(ContentModeration moderation)
    {
        // INSERT vào database
    }
    
    public async Task<ContentModeration?> GetByContentAsync(string contentType, int contentId)
    {
        // Lấy kết quả moderation theo content
    }
    
    public async Task<List<ContentModeration>> GetPendingModerationsAsync()
    {
        // Lấy danh sách cần review thủ công
    }
}
```

---

## 📝 3. APPLICATION LAYER - COMMENT SERVICE

**File:** `Application/Services/CommentService.cs`

### 3.1. Tạo Comment (CreateCommentAsync)

**Luồng xử lý:**
```
1. TẠO COMMENT NGAY (UX mượt)
   ↓
2. Gửi notification cho post owner
   ↓
3. BACKGROUND: Kiểm tra toxic
   ├─ Gọi ML Service (6 giây chờ)
   ├─ Lưu kết quả vào ContentModeration
   └─ Nếu high_risk:
      ├─ Đợi 6 giây
      ├─ Soft delete comment
      └─ Gửi notification cho user
```

**Code:**
```csharp
public async Task<CommentDto> CreateCommentAsync(CreateCommentDto dto, int currentAccountId)
{
    // 1. TẠO COMMENT TRƯỚC (như Instagram/Facebook)
    var comment = new Comment
    {
        PostId = dto.PostId,
        UserId = user.user_id,
        Content = dto.Content,
        CreatedAt = DateTime.UtcNow
    };
    var createdComment = await _commentRepository.CreateAsync(comment);
    
    // 2. Gửi notification ngay
    await SendCommentNotificationAsync(createdComment, user);

    // 3. KIỂM TRA TOXIC TRONG BACKGROUND
    _ = Task.Run(async () => 
        await CheckAndDeleteToxicCommentAsync(createdComment.CommentId, dto.Content, ...));

    return MapToDto(createdComment);
}
```

### 3.2. Background Moderation (CheckAndDeleteToxicCommentAsync)

**Code chi tiết:**
```csharp
private async Task CheckAndDeleteToxicCommentAsync(
    int commentId, string content, int accountId, int userId)
{
    using var scope = _scopeFactory.CreateScope();
    var moderationService = scope.ServiceProvider.GetRequiredService<IContentModerationService>();
    
    try
    {
        // 1. GỌI ML SERVICE
        var moderationResult = await moderationService.AnalyzeTextAsync(content);
        
        // 2. LƯU KẾT QUẢ VÀO DATABASE
        var moderation = new ContentModeration
        {
            ContentType = "Comment",
            ContentID = commentId,
            AccountId = accountId,
            CommentId = commentId,
            AIConfidence = moderationResult.Confidence,
            ToxicLabel = moderationResult.Label,
            Status = moderationResult.RiskLevel switch
            {
                "high_risk" => "blocked",
                "medium_risk" => "pending",
                "low_risk" => "approved",
                _ => "approved"
            },
            CreatedAt = DateTime.UtcNow
        };
        await moderationRepository.CreateAsync(moderation);
        
        // 3. NẾU HIGH_RISK → XÓA SAU 6 GIÂY
        if (moderationResult.RiskLevel == "high_risk")
        {
            Console.WriteLine($"[MODERATION] Toxic comment {commentId}. Waiting 6s...");
            
            await Task.Delay(6000);  // ⏱️ 6 giây
            
            // Soft delete
            await commentRepository.SoftDeleteAsync(commentId);
            
            // Gửi notification cho user
            await notificationRepository.AddAsync(new Notification
            {
                user_id = userId,
                content = $"Comment đã bị xóa do vi phạm: {moderationResult.Label}",
                ...
            });
            
            Console.WriteLine($"[MODERATION] Deleted toxic comment {commentId}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[MODERATION] Error: {ex.Message}");
    }
}
```

### 3.3. Cập nhật Comment (UpdateCommentAsync)

**Luồng xử lý:**
```
1. Kiểm tra toxic TRƯỚC KHI update
   ↓
2. Nếu high_risk → Throw exception (chặn)
   ↓
3. Nếu safe → Update comment
   ↓
4. Lưu kết quả moderation
```

**Code:**
```csharp
public async Task<CommentDto> UpdateCommentAsync(int commentId, string newContent, int currentAccountId)
{
    // 1. KIỂM TRA TOXIC TRƯỚC
    var moderationResult = await _moderationService.AnalyzeTextAsync(newContent);
    
    if (moderationResult.RiskLevel == "high_risk")
    {
        throw new Exception($"Comment bị chặn do vi phạm: {moderationResult.Label}");
    }

    // 2. UPDATE COMMENT
    comment.Content = newContent;
    comment.IsEdited = true;
    var updatedComment = await _commentRepository.UpdateAsync(comment);

    // 3. LƯU KẾT QUẢ MODERATION
    await SaveModerationResultAsync(moderationResult, "Comment", commentId, ...);

    return MapToDto(updatedComment);
}
```

---

## 📄 4. PRESENTATION LAYER - POSTS CONTROLLER

**File:** `Presentation/WebAPI/Controllers/PostsController.cs`

### 4.1. Tạo Post (CreatePost)

**Luồng xử lý Caption:**
```
1. Kiểm tra toxic CHO CAPTION
   ↓
2. Nếu high_risk → Return BadRequest (CHẶN)
   ↓
3. Nếu safe → Tạo post
   ↓
4. Lưu kết quả moderation vào DB
```

**Code:**
```csharp
[HttpPost]
public async Task<IActionResult> CreatePost([FromForm] CreatePostFormDto form)
{
    // 1. KIỂM TRA TOXIC CHO CAPTION TRƯỚC
    if (!string.IsNullOrWhiteSpace(form.Caption))
    {
        try
        {
            var moderationResult = await _moderationService.AnalyzeTextAsync(form.Caption);
            
            // 2. NẾU HIGH_RISK → CHẶN POST
            if (moderationResult.RiskLevel == "high_risk")
            {
                return BadRequest(new { 
                    message = $"Bài đăng bị chặn do vi phạm: {moderationResult.Label}" 
                });
            }
        }
        catch (Exception ex)
        {
            // ML Service không khả dụng - cho phép post
            Console.WriteLine($"[Moderation Warning] ML unavailable: {ex.Message}");
        }
    }

    // 3. TẠO POST
    var post = new Post { ... };
    var createdPost = await _postRepository.AddAsync(post);

    // 4. LƯU KẾT QUẢ MODERATION
    if (!string.IsNullOrWhiteSpace(form.Caption))
    {
        var moderationResult = await _moderationService.AnalyzeTextAsync(form.Caption);
        var moderation = new ContentModeration
        {
            ContentType = "Post",
            ContentID = createdPost.post_id,
            AccountId = accountId,
            PostId = createdPost.post_id,
            AIConfidence = moderationResult.Confidence,
            ToxicLabel = moderationResult.Label,
            Status = moderationResult.RiskLevel switch
            {
                "high_risk" => "blocked",
                "medium_risk" => "pending",
                _ => "approved"
            },
            CreatedAt = DateTime.UtcNow
        };
        await _moderationRepository.CreateAsync(moderation);
    }
    
    return Ok(...);
}
```

### 4.2. Update Post Caption

**Tương tự Create Post:**
- Kiểm tra toxic trước khi update
- Nếu high_risk → chặn
- Nếu safe → update và lưu moderation result

---

## 🔄 5. DEPENDENCY INJECTION SETUP

**File:** `Presentation/WebAPI/Program.cs`

```csharp
// 1. ML Service URL
var mlApiUrl = builder.Configuration["MLService:ApiUrl"] ?? "http://127.0.0.1:8000";

// 2. PhoBERT Moderation Service
builder.Services.AddHttpClient<IContentModerationService, PhoBertModerationService>()
    .ConfigureHttpClient(client => client.Timeout = TimeSpan.FromSeconds(30))
    .AddTypedClient<IContentModerationService>(client => 
        new PhoBertModerationService(client, mlApiUrl));

// 3. ContentModeration Repository
builder.Services.AddScoped<IContentModerationRepository>(provider =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    return new ContentModerationRepository(connectionString!);
});

// 4. Comment Service (có inject IContentModerationService)
builder.Services.AddScoped<CommentService>();
```

---

## 📊 6. LUỒNG XỬ LÝ CHI TIẾT

### 6.1. Create Comment Flow

```
User gửi comment
    ↓
CommentsController.CreateComment()
    ↓
CommentService.CreateCommentAsync()
    ├─ Tạo comment ngay → DB
    ├─ Gửi notification → Post owner
    └─ Task.Run (Background) → CheckAndDeleteToxicCommentAsync()
        ├─ PhoBertModerationService.AnalyzeTextAsync()
        │   └─ POST http://127.0.0.1:8000/moderate
        │       └─ Python ML Service xử lý PhoBERT
        │           └─ Return: is_safe, label, risk_level, confidence
        ├─ Lưu ContentModeration → DB
        └─ Nếu high_risk:
            ├─ Task.Delay(6000) - Đợi 6 giây
            ├─ SoftDelete comment
            └─ Send notification → User
```

### 6.2. Create Post Flow

```
User tạo post với caption
    ↓
PostsController.CreatePost()
    ├─ PhoBertModerationService.AnalyzeTextAsync(caption)
    │   └─ POST http://127.0.0.1:8000/moderate
    ├─ Nếu high_risk → Return BadRequest (CHẶN)
    ├─ Nếu safe → Tạo Post → DB
    └─ Lưu ContentModeration → DB
```

### 6.3. Update Comment Flow

```
User sửa comment
    ↓
CommentsController.UpdateComment()
    ↓
CommentService.UpdateCommentAsync()
    ├─ PhoBertModerationService.AnalyzeTextAsync(newContent)
    ├─ Nếu high_risk → Throw Exception (CHẶN)
    ├─ Nếu safe → Update comment
    └─ Lưu ContentModeration → DB
```

---

## 📁 7. TẤT CẢ FILES LIÊN QUAN

### Python ML Service
```
MLService/
├── app.py                              ← FastAPI server, PhoBERT inference
├── requirements.txt                    ← Dependencies
└── models/
    └── phobert_vietnamese_moderation/  ← PhoBERT model files
```

### C# Backend

#### Domain Layer
```
Domain/
├── Entities/
│   └── ContentModeration.cs           ← Entity chứa kết quả moderation
└── Interfaces/
    ├── IContentModerationService.cs   ← Interface cho ML Service
    └── IContentModerationRepository.cs ← Interface cho Repository
```

#### Infrastructure Layer
```
Infrastructure/
├── ExternalServices/
│   └── PhoBertModerationService.cs    ← HTTP Client gọi Python ML Service
├── Repositories/
│   └── ContentModerationRepository.cs ← SQL queries cho ContentModeration
└── Persistence/
    └── AppDbContext.cs                ← DbSet<ContentModeration>
```

#### Application Layer
```
Application/
└── Services/
    └── CommentService.cs              ← Logic xử lý comment moderation
```

#### Presentation Layer
```
Presentation/WebAPI/
├── Controllers/
│   ├── PostsController.cs             ← API endpoints cho Posts (moderation caption)
│   └── CommentsController.cs          ← API endpoints cho Comments
└── Program.cs                         ← DI registration
```

---

## ⚙️ 8. CONFIGURATION

### appsettings.json
```json
{
  "MLService": {
    "ApiUrl": "http://127.0.0.1:8000"
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=...;Database=...;"
  }
}
```

### Chạy ML Service
```bash
cd MLService
pip install -r requirements.txt
python app.py
```

Server sẽ chạy tại: `http://127.0.0.1:8000`

---

## 🔍 9. TESTING

### Test ML Service
```bash
curl -X POST http://127.0.0.1:8000/moderate \
  -H "Content-Type: application/json" \
  -d '{"text": "Đồ ngu ngốc"}'
```

**Response:**
```json
{
  "is_safe": false,
  "label": "toxic",
  "confidence": 0.87,
  "risk_level": "high_risk",
  "cumulative_negative": 0.92,
  "all_scores": {
    "safe": 0.08,
    "toxic": 0.87,
    "hate": 0.03,
    "violence": 0.01,
    "nsfw": 0.01,
    "suicide": 0.0
  }
}
```

### Test Comment API
```bash
POST /api/comments
{
  "postId": 123,
  "content": "Bình luận toxic test",
  "parentCommentId": null
}
```

**Hành vi:**
1. Comment được tạo ngay và trả về cho user
2. Background: Sau 6 giây → Comment bị xóa tự động
3. User nhận notification: "Comment đã bị xóa do vi phạm..."

---

## 📌 10. KEY POINTS

### ✅ Ưu điểm
1. **UX mượt mà** - Comment hiện ngay, không phải đợi AI
2. **Failsafe** - Nếu ML Service down, vẫn cho phép post/comment
3. **Background processing** - Không làm chậm API response
4. **Audit trail** - Lưu tất cả kết quả moderation vào DB
5. **6 giây grace period** - User có thời gian nhìn thấy comment trước khi bị xóa

### ⚠️ Lưu ý
1. **ML Service phải chạy** trước khi start C# API
2. **Timeout 30s** cho HTTP calls đến ML Service
3. **Background tasks** chạy trong scope riêng (avoid DbContext conflicts)
4. **Soft delete** - Comments không bị xóa vĩnh viễn, có thể restore
5. **High risk = chặn** cho Posts, nhưng cho Comments đi qua rồi xóa sau

---

## 🎯 11. SUMMARY

**Toxic Detection Flow:**
```
User Input (Comment/Post Caption)
    ↓
C# Backend (PhoBertModerationService)
    ↓
HTTP POST → Python ML Service (app.py)
    ↓
PhoBERT Model Inference
    ↓
Return: is_safe, label, risk_level, confidence
    ↓
C# Backend: Save to ContentModeration table
    ↓
Action based on risk_level:
├─ high_risk (Comment) → Create → Wait 6s → Delete → Notify
├─ high_risk (Post) → Block creation → Return error
└─ low/medium_risk → Approve → Save
```

**Files tóm tắt:**
- 🐍 **app.py** - Python ML Service (PhoBERT)
- 🔧 **PhoBertModerationService.cs** - HTTP Client gọi ML
- 📝 **CommentService.cs** - Xử lý comment moderation
- 📄 **PostsController.cs** - Xử lý post caption moderation
- 💾 **ContentModeration.cs** - Entity lưu kết quả
- 🗃️ **ContentModerationRepository.cs** - Database operations

---

**📅 Last Updated:** December 15, 2025  
**📌 Version:** 1.0.0
