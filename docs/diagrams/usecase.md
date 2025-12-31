# Use Case Diagram (Toàn hệ thống)

Mô tả: sơ đồ Use Case tổng thể cho hệ thống (chỉ 1 sơ đồ duy nhất). Đây là một phiên bản chuyển sang `flowchart` để đảm bảo tương thích với renderer trên GitHub.

```mermaid
flowchart LR
  subgraph Actors
    User(User)
    Admin(Admin)
    AI("AI Moderation System")
    Payment("Payment Gateway")
  end

  subgraph UseCases
    UC1[(Register / Login)]
    UC2[(Create Post)]
    UC3[(Interact with Content)]
    UC4[(View Feed)]
    UC5[(Manage System)]
    UC6[(Moderate Content)]
    UC7[(Process Payment)]
  end

  User --> UC1
  User --> UC2
  User --> UC3
  User --> UC4
  Admin --> UC5
  Admin --> UC6
  AI --> UC6
  Payment --> UC7

  UC2 -.-> UC6
  UC7 -.-> UC5
```

