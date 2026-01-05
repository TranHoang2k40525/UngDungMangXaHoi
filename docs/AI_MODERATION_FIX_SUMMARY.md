# 🔧 KHẮC PHỤC XONG: Comment Vi Phạm Không Hiển Thị Trên Web Admin

## ❌ VẤN ĐỀ

-   User comment toxic trên App
-   Web Admin **KHÔNG hiển thị** trong AI Moderation page

## ✅ NGUYÊN NHÂN

**Status value không khớp giữa Backend và API:**

| Component      | Status Value                        |
| -------------- | ----------------------------------- |
| Backend lưu DB | `"blocked"`                         |
| API tìm kiếm   | `"rejected"` ❌                     |
| **Kết quả**    | **Không match → Không trả về data** |

## ✅ GIẢI PHÁP ĐÃ LÀM

Sửa **AIModerationController.cs** - Tất cả 5 endpoints:

```csharp
// TRƯỚC (SAI):
.Where(m => m.Status == "rejected")

// SAU (ĐÚNG):
.Where(m => m.Status == "rejected" || m.Status == "blocked")
```

## 📁 FILES ĐÃ SỬA

1. ✅ `Presentation/WebAPI/Controllers/AIModerationController.cs`

    - Sửa 5 endpoints để query cả `"blocked"` và `"rejected"`

2. ✅ `SQL/check_content_moderation_status.sql` (NEW)

    - Script kiểm tra data trong database

3. ✅ `docs/AI_MODERATION_BUG_FIX.md` (NEW)
    - Documentation chi tiết về bug và fix

## 🧪 TEST NGAY BÂY GIỜ

### Bước 1: Kiểm tra Database

```sql
-- Chạy file: SQL/check_content_moderation_status.sql
SELECT Status, COUNT(*) FROM ContentModerations GROUP BY Status;
```

**Kỳ vọng thấy:**

```
Status    | Count
----------|------
blocked   | 1+    ← Comment toxic đã lưu
approved  | X
pending   | Y
```

### Bước 2: Restart Backend

```bash
cd Presentation/WebAPI
dotnet run
```

### Bước 3: Test Web Admin

```
1. Login Web Admin với tài khoản Admin
2. Vào menu "🤖 AI Content Moderation"
3. Tab "Overview":
   - Violations > 0 ✅
   - Violating Users > 0 ✅
4. Tab "Violators":
   - Thấy user đã comment toxic ✅
5. Tab "Reports":
   - Thấy comment violation ✅
```

## ⚠️ LƯU Ý

### 1. Background Process

-   Comment toxic mất **6 giây** mới bị xóa (như Instagram)
-   Trong 6s đó vẫn hiển thị trên App

### 2. MLService Python phải chạy

```bash
# Check MLService
docker ps | grep mlservice

# Hoặc
curl http://localhost:5001/health
```

### 3. Logs để debug

```
[MODERATION] Checking comment {id}...
[MODERATION] Result: Label=toxic, RiskLevel=high_risk
[MODERATION] DELETING toxic comment {id}
```

## 📊 STATUS VALUES HIỆN TẠI

| Risk Level  | Backend Status | Web Admin                      |
| ----------- | -------------- | ------------------------------ |
| High Risk   | `blocked`      | ✅ Hiển thị                    |
| Medium Risk | `pending`      | ⚠️ Không hiển thị (chưa query) |
| Low Risk    | `approved`     | ❌ Không hiển thị              |

**Nếu muốn hiển thị cả Medium Risk**, thêm `|| m.Status == "pending"` vào query.

---

## 🎉 KẾT QUẢ

✅ **Đã sửa xong và sẵn sàng test!**

Bây giờ Web Admin sẽ hiển thị:

-   ✅ Comment toxic statistics
-   ✅ Violating users
-   ✅ Violation reports
-   ✅ User violation history
-   ✅ Delete account feature

---

**Status**: ✅ FIXED  
**Test Required**: Yes (follow steps above)  
**Rollback**: Not needed (only query logic changed)
