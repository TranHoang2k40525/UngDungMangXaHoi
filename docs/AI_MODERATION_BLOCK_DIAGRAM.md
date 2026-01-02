**Sơ đồ tổng quan giải pháp AI kiểm duyệt nội dung**

- **Loại sơ đồ**: Sơ đồ khối (Block Diagram)
- **Thành phần**: `Backend API`, `AI Moderation Service`, `Mô hình AI`, `Kết quả phân loại`

```mermaid
flowchart LR
  User[User / Ứng dụng khách] -->|Gửi nội dung| BackendAPI[Backend API]
  BackendAPI -->|Chuyển tiếp| ModerationService[AI Moderation Service]
  ModerationService -->|Gọi inference| AIModel[Mô hình AI]
  AIModel -->|Kết quả phân loại| Results[Kết quả phân loại]
  Results -->|Trả kết quả| BackendAPI
  BackendAPI -->|Trả về| User

  %% Optional: logs/audit
  ModerationService -->|Ghi log / Audit| Logs[(Logs / Audit)]
```

Hướng dẫn nhanh để xem/ xuất:

- Trong VS Code: cài extension `Markdown Preview Mermaid Support` hoặc `Mermaid Markdown Preview` rồi mở file `DOCS/AI_MODERATION_BLOCK_DIAGRAM.md` và chọn "Open Preview".

- Xuất sang PNG (PowerShell): cài `@mermaid-js/mermaid-cli` rồi chạy:

```powershell
npm install -g @mermaid-js/mermaid-cli
mmdc -i .\DOCS\AI_MODERATION_BLOCK_DIAGRAM.mmd -o .\DOCS\AI_MODERATION_BLOCK_DIAGRAM.png
```

File sơ đồ chính (dùng để xuất): `DOCS/AI_MODERATION_BLOCK_DIAGRAM.mmd`

Nếu bạn muốn, tôi có thể:
- Xuất luôn sang PNG trong workspace.
- Thêm các thành phần bổ sung (ví dụ: Datastore, Message Queue, External Moderation API).
- Tạo phiên bản bằng PlantUML hoặc PNG/SVG trực tiếp.
