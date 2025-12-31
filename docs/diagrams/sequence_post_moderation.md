sequenceDiagram
    participant User
    participant MobileApp
    participant WebAPI
    participant PostsService
    participant AIService
    participant DB

    User->>MobileApp: Compose post + files
    MobileApp->>WebAPI: POST /api/posts
    WebAPI->>PostsService: CreatePost(dto, files)
    PostsService->>AIService: Analyze content
    AIService-->>PostsService: riskLevel
    alt high risk
      PostsService-->>WebAPI: 400 Blocked
    else low/medium
      PostsService->>DB: Save Post
      DB-->>PostsService: postId
      PostsService->>WebAPI: 201 Created
    end


