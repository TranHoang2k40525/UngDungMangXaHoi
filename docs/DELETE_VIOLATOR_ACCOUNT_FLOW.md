# CHỨC NĂNG XÓA TÀI KHOẢN VI PHẠM

## Mô tả tổng quan

Tính năng cho phép Admin xóa vĩnh viễn tài khoản người dùng vi phạm chính sách cộng đồng, đồng thời gửi email thông báo đến người dùng.

---

## Luồng xử lý (Flow)

### 1. Frontend - Admin Click "Xóa tài khoản"

**File**: `Presentation/WebApp/WebAdmins/src/pages/moderation/AIModeration.js`

```javascript
// ViolatorsTab Component
<button onClick={() => setShowDeleteModal(violator)} className="btn btn-danger">
    🗑️ Xóa tài khoản
</button>
```

### 2. Hiển thị Modal xác nhận

**Component**: `DeleteAccountModal`

-   Hiển thị thông tin user: `@username`, `email`
-   Yêu cầu nhập lý do xóa (tối thiểu 10 ký tự)
-   Cảnh báo: "Hành động này KHÔNG THỂ HOÀN TÁC"

### 3. Admin nhập lý do và xác nhận

**Handler**: `handleDeleteAccount(violator, reason)`

```javascript
const handleDeleteAccount = async (violator, reason) => {
    // Validate: reason >= 10 chars
    if (!reason || reason.trim().length < 10) {
        alert("Vui lòng nhập lý do xóa tài khoản (ít nhất 10 ký tự)");
        return;
    }

    // Double confirm
    if (
        !window.confirm(
            `Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản của ${violator.username}?`
        )
    ) {
        return;
    }

    try {
        // Call API
        await aiModerationAPI.deleteViolator(violator.accountId, reason);
        alert("✅ Đã xóa tài khoản và gửi email thông báo thành công!");

        // Refresh list
        setShowDeleteModal(null);
        loadViolators();
    } catch (error) {
        alert("❌ Lỗi: " + error.message);
    }
};
```

### 4. API Call

**File**: `Presentation/WebApp/WebAdmins/src/services/api.js`

```javascript
async deleteViolator(accountId, reason = "") {
    return apiClient.delete(
        `/api/ai-moderation/delete-violator/${accountId}`,
        {
            data: { Reason: reason },
        }
    );
}
```

**HTTP Request**:

```http
DELETE /api/ai-moderation/delete-violator/{accountId}
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "Reason": "Vi phạm chính sách cộng đồng nhiều lần..."
}
```

### 5. Backend Processing

**File**: `Presentation/WebAPI/Controllers/AIModerationController.cs`

```csharp
[HttpDelete("delete-violator/{accountId}")]
public async Task<IActionResult> DeleteViolator(int accountId, [FromBody] DeleteViolatorRequest request)
{
    // 1. Tìm account
    var account = await _context.Accounts
        .Include(a => a.User)
        .FirstOrDefaultAsync(a => a.account_id == accountId);

    if (account == null)
        return NotFound(new { message = "Không tìm thấy tài khoản" });

    // 2. Đếm số lần vi phạm
    var violationCount = await _context.ContentModerations
        .Where(m => m.AccountId == accountId &&
               (m.Status == "rejected" || m.Status == "blocked"))
        .CountAsync();

    // 3. Gửi email thông báo
    var emailValue = account.email?.Value;
    if (!string.IsNullOrEmpty(emailValue))
    {
        try
        {
            await _emailService.SendAccountDeletionEmailAsync(
                emailValue,
                account.User?.full_name ?? "User",
                request.Reason,
                violationCount
            );
            Console.WriteLine($"✅ Email deletion notification sent to: {emailValue}");
        }
        catch (Exception emailEx)
        {
            Console.WriteLine($"❌ Email error: {emailEx.Message}");
        }
    }

    // 4. Xóa account (cascade sẽ xóa User và các dữ liệu liên quan)
    _context.Accounts.Remove(account);
    await _context.SaveChangesAsync();
    Console.WriteLine($"✅ Account deleted: {accountId}");

    return Ok(new
    {
        message = "Đã xóa tài khoản thành công",
        deletedAccountId = accountId,
        email = emailValue,
        violationCount
    });
}
```

### 6. Email Service

**Interface**: `Domain/Interfaces/IEmailService.cs`

```csharp
public interface IEmailService
{
    Task SendOtpEmailAsync(string email, string otp, string purpose, string fullName);
    Task SendAccountDeletionEmailAsync(string email, string fullName, string reason, int violationCount);
}
```

**Implementation**: `Infrastructure/Services/EmailService.cs`

```csharp
public async Task SendAccountDeletionEmailAsync(
    string email,
    string fullName,
    string reason,
    int violationCount)
{
    using var client = new SmtpClient(_smtpHost, _smtpPort)
    {
        Credentials = new NetworkCredential(_smtpUser, _smtpPass),
        EnableSsl = true
    };

    var subject = "⚠️ THÔNG BÁO XÓA TÀI KHOẢN";
    var body = GenerateAccountDeletionEmailBody(fullName, reason, violationCount);

    var mailMessage = new MailMessage
    {
        From = new MailAddress(_fromAddress),
        Subject = subject,
        Body = body,
        IsBodyHtml = true
    };
    mailMessage.To.Add(email);

    await client.SendMailAsync(mailMessage);
}
```

### 7. Email Template

**Method**: `GenerateAccountDeletionEmailBody()`

Email HTML bao gồm:

-   ⚠️ **Header**: Cảnh báo quan trọng
-   📊 **Thông tin**: Số lần vi phạm, lý do xóa
-   ❌ **Hậu quả**: Email bị hủy, bài đăng/bình luận bị xóa
-   ⚠️ **Lưu ý**: Liên hệ support trong 7 ngày nếu nhầm lẫn

---

## Database Changes (Cascade Delete)

Khi xóa Account, các bảng sau cũng bị xóa (CASCADE):

```sql
-- Xóa User
DELETE FROM Users WHERE account_id = @accountId

-- Xóa các bảng liên quan (CASCADE)
DELETE FROM Posts WHERE user_id = @userId
DELETE FROM Comments WHERE user_id = @userId
DELETE FROM ContentModeration WHERE account_id = @accountId
DELETE FROM Notifications WHERE account_id = @accountId
DELETE FROM Messages WHERE sender_id = @userId OR receiver_id = @userId
-- ... các bảng khác
```

---

## Console Logs (Backend)

Khi xóa tài khoản thành công, Backend sẽ log:

```
✅ Email deletion notification sent to: user@example.com
✅ Account deleted: 123
```

Nếu lỗi email (nhưng vẫn xóa account):

```
❌ Email error: SMTP connection failed
✅ Account deleted: 123
```

---

## Test Scenarios

### ✅ Happy Path

1. Admin login vào Web Admin
2. Vào "AI Moderation" > Tab "Người dùng vi phạm"
3. Click "Xóa tài khoản" cho user có nhiều vi phạm
4. Nhập lý do: "Vi phạm chính sách cộng đồng 5 lần"
5. Click "Xác nhận xóa"
6. **Kết quả**:
    - ✅ Email gửi đến `user@gmail.com`
    - ✅ Account bị xóa khỏi database
    - ✅ User không thể login lại
    - ✅ Tất cả posts/comments của user bị xóa

### ❌ Error Cases

**Case 1: Lý do quá ngắn**

-   Input: "spam"
-   **Alert**: "Vui lòng nhập lý do xóa tài khoản (ít nhất 10 ký tự)"

**Case 2: Admin không xác nhận**

-   Click "Hủy" ở modal confirm
-   **Kết quả**: Không xóa

**Case 3: Email service lỗi**

-   SMTP server down
-   **Kết quả**:
    -   ⚠️ Email không gửi được (log error)
    -   ✅ Account vẫn bị xóa
    -   Admin thấy thông báo "Đã xóa tài khoản thành công"

---

## Security

### Authorization

-   Endpoint yêu cầu: `[Authorize(Roles = "Admin")]`
-   Chỉ Admin mới có quyền xóa

### Validation

-   `Reason` phải >= 10 ký tự
-   `accountId` phải tồn tại trong database
-   Double confirm từ Admin

### Audit Trail

-   Console logs ghi lại: email, accountId, timestamp
-   Có thể mở rộng: Lưu vào `AdminActionsLog` table

---

## Email Configuration

File `.env`:

```env
Email__SmtpHost=smtp.gmail.com
Email__SmtpPort=587
Email__SmtpUser=your-email@gmail.com
Email__SmtpPass=your-app-password
Email__From=noreply@ungdungmangxahoi.com
```

---

## Status Code

| Code | Message               | Meaning               |
| ---- | --------------------- | --------------------- |
| 200  | OK                    | Xóa thành công        |
| 404  | Not Found             | Account không tồn tại |
| 401  | Unauthorized          | Chưa login            |
| 403  | Forbidden             | Không phải Admin      |
| 500  | Internal Server Error | Lỗi server            |

---

## Future Enhancements

1. **Soft Delete**: Thay vì xóa vĩnh viễn, chỉ đánh dấu `is_deleted = true`
2. **Restore Window**: Cho phép restore trong 30 ngày
3. **Admin Actions Log**: Lưu lại lịch sử Admin xóa account
4. **Email Queue**: Dùng background job để gửi email (không block API)
5. **Multiple Email Templates**: Tùy chỉnh template theo loại vi phạm

---

## Related Files

-   Frontend:

    -   `Presentation/WebApp/WebAdmins/src/pages/moderation/AIModeration.js`
    -   `Presentation/WebApp/WebAdmins/src/services/api.js`

-   Backend:

    -   `Presentation/WebAPI/Controllers/AIModerationController.cs`
    -   `Domain/Interfaces/IEmailService.cs`
    -   `Infrastructure/Services/EmailService.cs`

-   Database:
    -   `Accounts` table
    -   `Users` table
    -   `ContentModeration` table
