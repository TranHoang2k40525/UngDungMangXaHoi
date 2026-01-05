# 🔧 BUG FIX: AI MODERATION STATUS MISMATCH

## 📋 VẤN ĐỀ PHÁT HIỆN

User comment vi phạm trên Mobile App nhưng **KHÔNG HIỂN THỊ** trên Web Admin AI Moderation page.

## 🔍 NGUYÊN NHÂN GỐC RỄ

### **Status Value Mismatch**

Backend và Frontend sử dụng **2 bộ giá trị Status khác nhau**:

#### **CommentService.cs** (Backend - Khi tạo Comment):

```csharp
Status = moderationResult.RiskLevel switch
{
    "high_risk"   => "blocked",   // ❌ Lưu "blocked"
    "medium_risk" => "pending",   // ❌ Lưu "pending"
    "low_risk"    => "approved",  // ✅ OK
    _ => "approved"
}
```

#### **AIModerationController.cs** (API - Khi query):

```csharp
// ❌ CHỈ TÌM "rejected" - KHÔNG TÌM THẤY "blocked"
.Where(m => m.Status == "rejected")
```

### **Kết quả**:

-   Comment toxic được lưu với `Status = "blocked"` ✅
-   API query tìm `Status = "rejected"` ❌
-   **Không match** → Không trả về data → Frontend không hiển thị

---

## ✅ GIẢI PHÁP ĐÃ THỰC HIỆN

### **Sửa tất cả 5 endpoints trong AIModerationController.cs**

#### **1. GET `/statistics`**

```csharp
// TRƯỚC (SAI):
.Where(m => m.Status == "rejected")

// SAU (ĐÚNG):
.Where(m => m.Status == "rejected" || m.Status == "blocked")
```

#### **2. GET `/frequent-violators`**

```csharp
// TRƯỚC:
.Where(m => m.Status == "rejected")

// SAU:
.Where(m => m.Status == "rejected" || m.Status == "blocked")
```

#### **3. GET `/violation-reports`**

```csharp
// TRƯỚC:
.Where(m => m.Status == "rejected")

// SAU:
.Where(m => m.Status == "rejected" || m.Status == "blocked")
```

#### **4. GET `/user-violations/{accountId}`**

```csharp
// TRƯỚC:
.Where(m => m.AccountId == accountId && m.Status == "rejected")

// SAU:
.Where(m => m.AccountId == accountId && (m.Status == "rejected" || m.Status == "blocked"))
```

#### **5. DELETE `/delete-violator/{accountId}`**

```csharp
// TRƯỚC:
.Where(m => m.AccountId == accountId && m.Status == "rejected")

// SAU:
.Where(m => m.AccountId == accountId && (m.Status == "rejected" || m.Status == "blocked"))
```

---

## 🗃️ KIỂM TRA DATABASE

Chạy script SQL để verify data:

```sql
-- File: SQL/check_content_moderation_status.sql

SELECT Status, COUNT(*) AS Count
FROM ContentModerations
GROUP BY Status;

/* Kết quả mong đợi:
Status     | Count
-----------|------
approved   | XXX
blocked    | YYY   ← Đây là data comment toxic
pending    | ZZZ
*/
```

---

## 🎯 LUỒNG XỬ LÝ COMMENT TOXIC (Đúng)

```
1️⃣ User tạo Comment trên App
   ↓
2️⃣ CommentsController.CreateComment()
   ↓
3️⃣ CommentService.CreateCommentAsync()
   ↓
4️⃣ Lưu Comment vào DB (cho UX mượt)
   ↓
5️⃣ Background Task: CheckAndDeleteToxicCommentAsync()
   ↓
6️⃣ Call MLService Python API: AnalyzeTextAsync()
   ↓
7️⃣ Lưu ContentModeration với Status = "blocked" (nếu high_risk)
   ↓
8️⃣ Đợi 6 giây
   ↓
9️⃣ SoftDelete Comment (IsDeleted = true)
   ↓
🔟 Gửi Notification cho user
```

---

## 📊 STATUS VALUES MAPPING

| Risk Level    | Backend Status | API Query      | Hiển thị Admin    |
| ------------- | -------------- | -------------- | ----------------- |
| `high_risk`   | `"blocked"`    | ✅ Match       | ✅ Hiển thị       |
| `medium_risk` | `"pending"`    | ⚠️ Không query | ⚠️ Không hiển thị |
| `low_risk`    | `"approved"`   | ❌ Bỏ qua      | ❌ Không hiển thị |

### **Note về "pending":**

-   Backend lưu `Status = "pending"` cho medium_risk
-   API **CHƯA** query `"pending"` → Không hiển thị trên Admin
-   **Nếu muốn hiển thị cả medium_risk**, thêm:
    ```csharp
    .Where(m => m.Status == "rejected" || m.Status == "blocked" || m.Status == "pending")
    ```

---

## 🧪 TESTING

### **1. Test từ Mobile App:**

```
1. Đăng nhập App
2. Tạo comment toxic: "I hate you" hoặc "Fuck you"
3. Đợi 6 giây
4. Comment biến mất (bị xóa)
```

### **2. Kiểm tra Database:**

```sql
SELECT TOP 1 *
FROM ContentModerations
WHERE ContentType = 'Comment'
ORDER BY CreatedAt DESC;

-- Expect: Status = 'blocked', ToxicLabel = 'toxic'
```

### **3. Kiểm tra Web Admin:**

```
1. Login Web Admin
2. Vào "AI Content Moderation" page
3. Tab "Overview": Violation count tăng
4. Tab "Violators": User xuất hiện trong danh sách
5. Tab "Reports": Comment violation xuất hiện
6. Click "View Details": Xem history vi phạm
```

---

## 📝 FILES ĐÃ SỬA

### **Backend:**

-   ✅ `Presentation/WebAPI/Controllers/AIModerationController.cs`
    -   Sửa 5 endpoints để query cả `"blocked"` và `"rejected"`

### **SQL:**

-   ✅ `SQL/check_content_moderation_status.sql` (NEW)
    -   Script kiểm tra data và status distribution

### **Documentation:**

-   ✅ `docs/AI_MODERATION_BUG_FIX.md` (NEW)
    -   Chi tiết bug và giải pháp

---

## ⚠️ LƯU Ý QUAN TRỌNG

### **1. Không xóa "blocked" records trong DB**

-   Giữ nguyên để tracking lịch sử
-   API đã được sửa để query cả 2 loại

### **2. Background Task Delay**

-   Comment toxic mất **6 giây** mới bị xóa
-   Trong 6 giây đó, comment vẫn hiển thị trên App
-   Đây là UX pattern của Instagram/Facebook

### **3. Soft Delete**

-   Comment không bị xóa vĩnh viễn
-   Chỉ set `IsDeleted = true`
-   Admin vẫn có thể restore nếu cần

### **4. MLService Python cần chạy**

-   Backend call `http://mlservice:5000/analyze`
-   Nếu MLService down → Comment không được kiểm tra
-   Check logs: `[MODERATION] Checking comment {id}...`

---

## 🚀 DEPLOY STEPS

```bash
# 1. Build Backend
cd Presentation/WebAPI
dotnet build

# 2. Restart API
dotnet run

# 3. Test API endpoint
curl -X GET "http://localhost:5000/api/AIModeration/statistics" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 4. Kiểm tra response
# Expect: violatingContent > 0, violatingUsers > 0
```

---

## 📞 CONTACT

Nếu vẫn còn vấn đề:

1. Check logs: `[MODERATION]` prefix
2. Verify MLService: `docker ps | grep mlservice`
3. Run SQL script: `check_content_moderation_status.sql`
4. Screenshot kết quả và báo lại

---

**Status**: ✅ **FIXED - Ready for Testing**
**Date**: 2025-12-25
**Version**: 1.0
