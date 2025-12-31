erDiagram
  USER {
    int id PK
    string username
    string email
    string full_name
  }
  POST {
    int id PK
    int user_id FK
    string caption
    datetime created_at
  }
  COMMENT {
    int id PK
    int post_id FK
    int user_id FK
    string content
    datetime created_at
  }
  LIKE {
    int id PK
    int post_id FK
    int user_id FK
    datetime created_at
  }
  PAYMENT {
    int id PK
    int user_id FK
    decimal amount
    string status
    datetime created_at
  }
  NOTIFICATION {
    int id PK
    int user_id FK
    string type
    boolean is_read
    datetime created_at
  }

  USER ||--o{ POST : "creates"
  POST ||--o{ COMMENT : "has"
  USER ||--o{ COMMENT : "writes"
  POST ||--o{ LIKE : "has"
  USER ||--o{ LIKE : "gives"
  USER ||--o{ PAYMENT : "makes"
  USER ||--o{ NOTIFICATION : "receives"
