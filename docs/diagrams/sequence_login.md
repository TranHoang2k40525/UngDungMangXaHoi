sequenceDiagram
    participant User
    participant MobileApp
    participant WebAPI
    participant AuthService
    participant DB

    User->>MobileApp: Open app, submits credentials
    MobileApp->>WebAPI: POST /api/auth/login
    WebAPI->>AuthService: ValidateCredentials
    AuthService->>DB: SELECT user by username/email
    DB-->>AuthService: user record
    AuthService->>AuthService: Verify password
    AuthService-->>WebAPI: accessToken + refreshToken
    WebAPI-->>MobileApp: 200 OK {tokens}
