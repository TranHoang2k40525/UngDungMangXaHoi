# Hệ Thống Nhắn Tin Real-time

## Tổng Quan
Hệ thống nhắn tin 1-1 với WebSocket (SignalR) cho phép nhắn tin real-time giữa những người dùng theo dõi lẫn nhau.

## Files Đã Tạo

### Backend (.NET)

#### Domain Layer
- `Domain/Entities/Conversation.cs` - Entity cho cuộc trò chuyện
- `Domain/Entities/Message.cs` - Entity cho tin nhắn
- `Domain/Interfaces/IConversationRepository.cs` - Interface repository
- `Domain/Interfaces/IMessageRepository.cs` - Interface repository

#### Infrastructure Layer
- `Infrastructure/Configurations/ConversationConfiguration.cs` - EF Core configuration
- `Infrastructure/Configurations/MessageConfiguration.cs` - EF Core configuration
- `Infrastructure/Repositories/ConversationRepository.cs` - Implementation repository
- `Infrastructure/Repositories/MessageRepository.cs` - Implementation repository

#### Application Layer
- `Application/DTOs/ConversationDto.cs` - DTOs cho conversation
- `Application/DTOs/MessageDto.cs` - DTOs cho message
- `Application/Services/MessageService.cs` - Business logic

#### Presentation Layer
- `Presentation/WebAPI/Hubs/MessageHub.cs` - SignalR Hub cho WebSocket
- `Presentation/WebAPI/Controllers/MessagesController.cs` - REST API Controller

### Frontend (React Native)
- `MobileApp/src/Services/MessageWebSocketService.js` - WebSocket service
- `MobileApp/src/API/MessageAPI.js` - HTTP API service
- `MobileApp/src/Messegers/Messenger.js` - Màn hình danh sách chat (UPDATED)
- `MobileApp/src/Messegers/Doanchat.js` - Màn hình chat real-time (UPDATED)

### Documentation
- `MESSAGING_MIGRATION_GUIDE.md` - Hướng dẫn setup và migration
- `MESSAGING_SYSTEM_SUMMARY.md` - File này

## Các File Đã Cập Nhật

### Backend
- `Infrastructure/Persistence/AppDbContext.cs` - Thêm DbSet cho Conversations và Messages
- `Presentation/WebAPI/Program.cs` - Đăng ký repositories, services và hub

### Frontend
- `MobileApp/src/Messegers/Messenger.js` - Load từ API thay vì hardcode
- `MobileApp/src/Messegers/Doanchat.js` - Real-time chat với WebSocket

## API Endpoints

### REST API
```
GET    /api/messages/conversations              - Lấy danh sách conversations
GET    /api/messages/conversations/{userId}     - Lấy chi tiết conversation
POST   /api/messages/send                       - Gửi tin nhắn (HTTP fallback)
PUT    /api/messages/read/{conversationId}      - Đánh dấu đã đọc
DELETE /api/messages/{messageId}                - Xóa tin nhắn
GET    /api/messages/mutual-followers           - Lấy danh sách người có thể nhắn tin
```

### WebSocket Hub
```
HubUrl: /hubs/messages

Methods:
- SendMessage(SendMessageDto)           - Gửi tin nhắn
- MarkAsRead(conversationId)            - Đánh dấu đã đọc
- UserTyping(receiverId, isTyping)      - Thông báo đang gõ
- GetOnlineUsers()                      - Lấy danh sách online
- DeleteMessage(messageId)              - Xóa tin nhắn

Events:
- ReceiveMessage(message)               - Nhận tin nhắn mới
- MessageSent(message)                  - Xác nhận tin đã gửi
- MessagesRead(data)                    - Tin đã được đọc
- UserTyping(data)                      - User đang gõ
- UserOnline(userId)                    - User online
- UserOffline(userId)                   - User offline
- OnlineUsers(userIds)                  - Danh sách online
- MessageDeleted(messageId)             - Tin đã xóa
- Error(error)                          - Lỗi
```

## Features

### Đã Implement ✅
1. **Nhắn tin 1-1** giữa mutual followers
2. **Real-time messaging** với WebSocket
3. **Typing indicators** 
4. **Online/Offline status**
5. **Read receipts** (đã đọc)
6. **Message history** với pagination
7. **Unread count** badge
8. **Auto-reconnect** WebSocket
9. **HTTP fallback** nếu WebSocket fail
10. **Delete messages**

### Chưa Implement ❌
1. Media messages (ảnh, video)
2. Voice messages
3. Message reactions
4. Reply to message
5. Forward messages
6. Group chat
7. Push notifications
8. End-to-end encryption

## Cách Chạy

### 1. Setup Backend
```powershell
cd Presentation/WebAPI
dotnet ef migrations add AddMessagingSystem --project ../../Infrastructure
dotnet ef database update --project ../../Infrastructure
dotnet run
```

### 2. Setup Frontend
```bash
cd Presentation/MobileApp
npm install @microsoft/signalr @react-native-async-storage/async-storage
npm start
```

### 3. Test
- Tạo 2 users
- Follow lẫn nhau
- Mở app với 2 users khác nhau
- Nhắn tin real-time

## Kiến Trúc

```
Frontend (React Native)
    ↓
WebSocket (SignalR)  ←→  REST API
    ↓                       ↓
MessageHub           MessagesController
    ↓                       ↓
    →  MessageService  ←
              ↓
    ConversationRepository
    MessageRepository
              ↓
         Database
```

## Security
- ✅ JWT Authentication cho REST API
- ✅ JWT Authentication cho WebSocket
- ✅ Chỉ cho phép nhắn tin với mutual followers
- ✅ User chỉ xem được conversations của mình
- ✅ User chỉ xóa được tin nhắn của mình

## Performance
- ✅ Index trên conversation_id, sender_id, created_at
- ✅ Pagination cho message history
- ✅ Connection pooling (Entity Framework)
- ✅ Async/await pattern
- ✅ WebSocket connection reuse

## Kết Luận
Hệ thống nhắn tin real-time đã được implement hoàn chỉnh với:
- Backend: ASP.NET Core + SignalR
- Frontend: React Native + SignalR Client
- Database: SQL Server
- Authentication: JWT
- Real-time: WebSocket

Tất cả code đã sẵn sàng để chạy. Chỉ cần follow MESSAGING_MIGRATION_GUIDE.md để setup!
