# Use Case Diagram (Toàn hệ thống)

Mô tả: sơ đồ Use Case tổng thể cho hệ thống (chỉ 1 sơ đồ duy nhất).

```mermaid
usecaseDiagram
  actor User
  actor Admin
  actor AI as "AI Moderation System"
  actor Payment as "Payment Gateway"

  User --> (Register / Login)
  User --> (Create Post)
  User --> (Interact with Content)
  User --> (View Feed)
  Admin --> (Manage System)
  Admin --> (Moderate Content)
  AI --> (Moderate Content)
  Payment --> (Process Payment)

  (Create Post) .> (Moderate Content) : <<include>>
  (Process Payment) .> (Manage System) : <<include>>
```

File nguồn để export: `DOCS/diagrams/usecase.mmd`
