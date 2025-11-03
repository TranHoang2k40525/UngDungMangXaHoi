# Ứng Dụng Mạng Xã Hội - Backend

Dự án backend cho ứng dụng mạng xã hội được xây dựng theo kiến trúc Clean Architecture với .NET 8.

## Cấu Trúc Dự Án

```
UngDungMangXaHoi/
├── Domain/                    # Domain Layer (Trái tim của ứng dụng)
│   ├── Entities/             # Các thực thể chính
│   │   ├── User.cs
│   │   ├── Post.cs
│   │   ├── Comment.cs
│   │   ├── Friendship.cs
│   │   ├── PostLike.cs
│   │   └── CommentLike.cs
│   ├── ValueObjects/         # Các đối tượng giá trị
│   │   ├── Email.cs
│   │   ├── PasswordHash.cs
│   │   ├── ImageUrl.cs
│   │   └── UserName.cs
│   ├── Interfaces/           # Các interface
│   │   ├── IUserRepository.cs
│   │   ├── IPostRepository.cs
│   │   ├── ICommentRepository.cs
│   │   ├── IFriendshipRepository.cs
│   │   ├── INotificationService.cs
│   │   ├── IPasswordHasher.cs
│   │   └── ITokenService.cs
│   └── DTOs/                 # Data Transfer Objects
│       ├── UserDto.cs
│       ├── PostDto.cs
│       └── CommentDto.cs
├── Application/              # Application Layer (Logic nghiệp vụ)
│   ├── UseCases/            # Các use case
│   │   ├── Users/
│   │   │   ├── RegisterUser.cs
│   │   │   ├── LoginUser.cs
│   │   │   └── UpdateProfile.cs
│   │   ├── Posts/
│   │   │   ├── CreatePost.cs
│   │   │   ├── GetFeed.cs
│   │   │   └── DeletePost.cs
│   │   └── Comments/
│   │       ├── AddComment.cs
│   │       └── DeleteComment.cs
│   ├── Services/            # Các service
│   │   ├── AuthService.cs
│   │   └── NotificationService.cs
│   └── Validators/          # Các validator
│       ├── UserValidator.cs
│       ├── PostValidator.cs
│       └── CommentValidator.cs
├── Infrastructure/          # Infrastructure Layer (Kết nối kỹ thuật)
│   ├── Persistence/        # Database
│   │   └── AppDbContext.cs
│   ├── Configurations/     # Entity configurations
│   │   ├── UserConfiguration.cs
│   │   ├── PostConfiguration.cs
│   │   ├── CommentConfiguration.cs
│   │   ├── FriendshipConfiguration.cs
│   │   ├── PostLikeConfiguration.cs
│   │   └── CommentLikeConfiguration.cs
│   ├── Repositories/       # Repository implementations
│   │   ├── UserRepository.cs
│   │   ├── PostRepository.cs
│   │   ├── CommentRepository.cs
│   │   └── FriendshipRepository.cs
│   ├── Services/           # Infrastructure services
│   │   └── BCryptPasswordHasher.cs
│   └── ExternalServices/   # External services
│       ├── FirebaseService.cs
│       └── CloudinaryService.cs
└── Presentation/           # Presentation Layer
    └── WebAPI/            # Web API
        ├── Controllers/
        │   ├── UserController.cs
        │   ├── PostController.cs
        │   └── CommentController.cs
        ├── Program.cs
        └── appsettings.json
```

## Tính Năng Chính

### 1. Quản Lý Người Dùng
- Đăng ký tài khoản
- Đăng nhập với JWT
- Cập nhật thông tin cá nhân
- Tìm kiếm người dùng

### 2. Quản Lý Bài Viết
- Tạo bài viết với nội dung, hình ảnh, video
- Xem feed (bài viết của bạn bè)
- Xóa bài viết
- Thích bài viết

### 3. Quản Lý Bình Luận
- Thêm bình luận vào bài viết
- Trả lời bình luận
- Xóa bình luận
- Thích bình luận

### 4. Quản Lý Bạn Bè
- Gửi lời mời kết bạn
- Chấp nhận/từ chối lời mời
- Chặn/bỏ chặn người dùng

## Cài Đặt và Chạy

### Yêu Cầu Hệ Thống
- .NET 8 SDK
- SQL Server hoặc SQL Server LocalDB
- Visual Studio 2022 hoặc VS Code

### Các Bước Cài Đặt

1. **Clone repository**
```bash
git clone <repository-url>
cd UngDungMangXaHoi
```

2. **Restore packages**
```bash
dotnet restore
```

3. **Cấu hình database**
- Mở file `Presentation/WebAPI/appsettings.json`
- Cập nhật connection string phù hợp với database của bạn

4. **Chạy ứng dụng**
```bash
dotnet run --project Presentation/WebAPI
```

5. **Truy cập Swagger UI**
- Mở trình duyệt và truy cập: `https://localhost:7000/swagger`

## API Endpoints

### Authentication
- `POST /api/user/register` - Đăng ký tài khoản
- `POST /api/user/login` - Đăng nhập

### User Management
- `GET /api/user/profile` - Lấy thông tin profile (cần authentication)
- `PUT /api/user/profile` - Cập nhật profile (cần authentication)

### Media & Posts (implemented)
- `POST /api/posts` (auth) — Tạo bài viết có kèm media (multipart/form-data)
  - Form fields:
    - `Caption` (string, optional)
    - `Location` (string, optional)
    - `Privacy` (string: `public` | `private` | `followers`)
    - `Images` (file[], nhiều ảnh, các đuôi: .jpg/.jpeg/.png/.gif/.webp)
    - `Video` (file, tối đa 100MB, đuôi: .mp4/.mov/.m4v/.avi/.wmv/.mkv)
  - Lưu trữ file:
    - Ảnh: `Presentation/WebAPI/Assets/Images/{username}_{random}.ext`
    - Video: `Presentation/WebAPI/Assets/Videos/{username}_{random}.ext`
    - Trong DB lưu CHỈ tên file (vd: `hoang_abcd1234.jpg`)
- `GET /api/posts/feed` — Lấy feed public + bài của chính mình
- `GET /api/posts/reels` — Lấy danh sách bài có video (public)
- `GET /api/posts/me` (auth) — Lấy bài đăng của chính mình
- Static files served under `/Assets/*` (ví dụ ảnh: `/Assets/Images/{fileName}`)

### Comment Management
- `POST /api/comment` - Thêm bình luận (cần authentication)
- `GET /api/comment/{id}` - Lấy chi tiết bình luận
- `GET /api/comment/post/{postId}` - Lấy bình luận theo bài viết
- `PUT /api/comment/{id}` - Cập nhật bình luận (cần authentication)
- `DELETE /api/comment/{id}` - Xóa bình luận (cần authentication)

## Cấu Hình

### JWT Settings
```json
{
  "JwtSettings": {
    "SecretKey": "YourSuperSecretKeyThatIsAtLeast32CharactersLong!",
    "Issuer": "UngDungMangXaHoi",
    "Audience": "UngDungMangXaHoi",
    "ExpirationMinutes": 60
  }
}
```

### Database Connection
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=UngDungMangXaHoiDb;Trusted_Connection=true;MultipleActiveResultSets=true"
  }
}
```

## Kiến Trúc

Dự án sử dụng **Clean Architecture** với các nguyên tắc:

1. **Dependency Inversion**: Các layer phụ thuộc vào abstractions, không phụ thuộc vào implementations
2. **Separation of Concerns**: Mỗi layer có trách nhiệm riêng biệt
3. **Single Responsibility**: Mỗi class có một trách nhiệm duy nhất
4. **Open/Closed Principle**: Dễ dàng mở rộng mà không cần sửa đổi code hiện tại

## Công Nghệ Sử Dụng

- **.NET 8** - Framework chính
- **Entity Framework Core** - ORM
- **SQL Server** - Database
- **JWT Bearer** - Authentication
- **Swagger/OpenAPI** - API Documentation
- **AutoMapper** - Object mapping (sẽ thêm sau)

## Phát Triển Tiếp

### Các tính năng cần bổ sung:
1. **File Upload**: Tích hợp Cloudinary để upload ảnh/video
2. **Real-time Notifications**: Sử dụng SignalR
3. **Push Notifications**: Tích hợp Firebase
4. **Caching**: Redis cho performance
5. **Logging**: Serilog
6. **Unit Tests**: xUnit
7. **Integration Tests**: TestContainers
8. **API Versioning**: Versioning API
9. **Rate Limiting**: Giới hạn request
10. **Background Jobs**: Hangfire

### Cải thiện bảo mật:
1. **Password Hashing**: Sử dụng BCrypt thay vì hash đơn giản
2. **Input Validation**: FluentValidation
3. **CORS Policy**: Cấu hình CORS chặt chẽ hơn
4. **HTTPS**: Bắt buộc HTTPS trong production

## Đóng Góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.