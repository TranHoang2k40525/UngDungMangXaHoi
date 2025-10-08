-- Tạo database chính cho ứng dụng mạng xã hội
CREATE DATABASE ungdungmangxahoiv_2;
GO  -- Kết thúc batch lệnh, thực thi lệnh trước

-- Chọn database vừa tạo để thực hiện các lệnh tiếp theo
USE ungdungmangxahoiv_2;
GO  -- Kết thúc batch

/* ==========================
   BẢNG TÀI KHOẢN CHUNG & XÁC THỰC
   Phần này tạo các bảng liên quan đến tài khoản, xác thực và phân loại user/admin.
   Accounts chỉ chứa thông tin cốt lõi cho xác thực (email và phone riêng biệt, có thể dùng 1 hoặc cả 2 để đăng ký/login).
   Users và Admins tách riêng thông tin profile/quyền, với Admins cũng có profile cá nhân giống Users.
========================== */
-- Tạo bảng Accounts: Chỉ lưu thông tin cốt lõi cho tài khoản (xác thực, loại, email/phone riêng)
CREATE TABLE Accounts (
    account_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính duy nhất cho tài khoản
    email NVARCHAR(100) UNIQUE NULL,  -- Email (có thể rỗng, dùng cho login/đăng ký, duy nhất nếu có)
    phone NVARCHAR(20) UNIQUE NULL,  -- Số điện thoại (có thể rỗng, dùng cho login/đăng ký/OTP, duy nhất nếu có)
    password_hash NVARCHAR(255) NOT NULL,  -- Mật khẩu đã băm (bcrypt), bắt buộc để bảo mật
    account_type NVARCHAR(20) NOT NULL CHECK (account_type IN ('Admin', 'User')),  -- Loại tài khoản ('Admin' hoặc 'User'), bắt buộc với ràng buộc CHECK
    status NVARCHAR(20) DEFAULT 'active',  -- Trạng thái tài khoản ('active', 'deactivated', 'banned'), mặc định active
    created_at DATETIME DEFAULT GETDATE(),  -- Thời gian tạo tài khoản, tự động hiện tại
    updated_at DATETIME DEFAULT GETDATE()  -- Thời gian cập nhật cuối, tự động hiện tại
);

-- Tạo index trên account_type để tìm kiếm nhanh theo loại tài khoản (e.g., lấy tất cả admin)
CREATE INDEX IX_Accounts_AccountType ON Accounts(account_type);
-- Tạo index trên email để login và tìm kiếm theo email nhanh
CREATE INDEX IX_Accounts_Email ON Accounts(email);
-- Tạo index trên phone để login và tìm kiếm theo SĐT nhanh
CREATE INDEX IX_Accounts_Phone ON Accounts(phone);

-- Tạo bảng Users: Tách riêng thông tin profile cá nhân cho người dùng thường
CREATE TABLE Users (
    user_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính cho user
    username NVARCHAR(50) UNIQUE NOT NULL,  -- Tên người dùng (có thể rỗng)
    account_id INT NOT NULL FOREIGN KEY REFERENCES Accounts(account_id) ON DELETE CASCADE,  -- Liên kết với Accounts, xóa cascade (xóa account → xóa user)
    full_name NVARCHAR(100),  -- Tên đầy đủ (có thể rỗng)
    gender NVARCHAR(10) NULL CHECK (gender IN ('Nam', 'Nữ', 'Khác')),  -- Giới tính ('Nam', 'Nữ', 'Khác' hoặc NULL nếu không tiết lộ)
    bio NVARCHAR(255),  -- Tiểu sử/giới thiệu bản thân (có thể rỗng, tối đa 255 ký tự)
    avatar_url NVARCHAR(255),  -- URL ảnh đại diện (có thể rỗng, lưu từ Azure Blob)
    is_private BIT DEFAULT 0,  -- Cờ tài khoản riêng tư (0=public, 1=private)
    date_of_birth DATE,  -- Ngày tháng năm sinh (có thể rỗng)
    address NVARCHAR(255),  -- Địa chỉ hiện tại (có thể rỗng)
    hometown NVARCHAR(255),  -- Quê quán (có thể rỗng)
    job NVARCHAR(255),  -- Công việc/Nghề nghiệp (có thể rỗng)
    website NVARCHAR(255)  -- Link website cá nhân (có thể rỗng)
);

-- Tạo bảng Admins: Tách riêng thông tin quyền và profile cá nhân cho admin (tương tự Users)
CREATE TABLE Admins (
    admin_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính cho admin
    account_id INT NOT NULL FOREIGN KEY REFERENCES Accounts(account_id) ON DELETE CASCADE,  -- Liên kết với Accounts, xóa cascade
    full_name NVARCHAR(100),  -- Tên đầy đủ (có thể rỗng)
    gender NVARCHAR(10) NULL CHECK (gender IN ('Nam', 'Nữ', 'Khác')),  -- Giới tính ('Nam', 'Nữ', 'Khác' hoặc NULL nếu không tiết lộ)
    bio NVARCHAR(255),  -- Tiểu sử/giới thiệu bản thân (có thể rỗng, tối đa 255 ký tự)
    avatar_url NVARCHAR(255),  -- URL ảnh đại diện (có thể rỗng, lưu từ Azure Blob)
    is_private BIT DEFAULT 0,  -- Cờ tài khoản riêng tư (0=public, 1=private)
    date_of_birth DATE,  -- Ngày tháng năm sinh (có thể rỗng)
    address NVARCHAR(255),  -- Địa chỉ hiện tại (có thể rỗng)
    hometown NVARCHAR(255),  -- Quê quán (có thể rỗng)
    job NVARCHAR(255),  -- Công việc/Nghề nghiệp (có thể rỗng)
    website NVARCHAR(255),  -- Link website cá nhân (có thể rỗng)
    admin_level NVARCHAR(20) DEFAULT 'moderator'  -- Cấp độ quyền ('super_admin', 'moderator', v.v.), mặc định moderator
);

-- Tạo bảng OTPs: Quản lý mã OTP cho quên/đổi mật khẩu, lưu hashed để bảo mật
CREATE TABLE OTPs (
    otp_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    account_id INT NOT NULL FOREIGN KEY REFERENCES Accounts(account_id),  -- Liên kết tài khoản
    otp_hash NVARCHAR(255) NOT NULL,  -- Giá trị OTP đã băm (bắt buộc, e.g., bcrypt)
    purpose NVARCHAR(50) NOT NULL,  -- Mục đích sử dụng ('forgot_password' hoặc 'change_password')
    expires_at DATETIME NOT NULL,  -- Thời gian hết hạn (e.g., sau 5-10 phút)
    used BIT DEFAULT 0,  -- Cờ đã sử dụng (0=chưa, 1=đã dùng một lần)
    created_at DATETIME DEFAULT GETDATE()  -- Thời gian tạo OTP
);

-- Tạo index ghép trên account_id và otp_hash để verify OTP nhanh chóng
CREATE INDEX IX_OTPs_AccountId_Hash ON OTPs (account_id, otp_hash);

-- Tạo bảng RefreshTokens: Quản lý token làm mới cho JWT, duy trì phiên đăng nhập
CREATE TABLE RefreshTokens (
    token_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    account_id INT FOREIGN KEY REFERENCES Accounts(account_id),  -- Liên kết tài khoản
    refresh_token NVARCHAR(255) NOT NULL,  -- Giá trị token hashed (bắt buộc)
    expires_at DATETIME NOT NULL,  -- Thời gian hết hạn (e.g., 7-30 ngày)
    created_at DATETIME DEFAULT GETDATE()  -- Thời gian tạo token
);

-- Tạo index trên account_id để tìm token theo tài khoản nhanh
CREATE INDEX IX_RefreshTokens_AccountId ON RefreshTokens (account_id);

-- Tạo bảng LoginHistory: Lưu lịch sử đăng nhập để audit và phát hiện hành vi lạ
CREATE TABLE LoginHistory (
    history_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    account_id INT FOREIGN KEY REFERENCES Accounts(account_id),  -- Tài khoản đăng nhập
    ip_address NVARCHAR(50),  -- Địa chỉ IP (có thể rỗng)
    device_info NVARCHAR(100),  -- Thông tin thiết bị (browser/app, có thể rỗng)
    login_time DATETIME DEFAULT GETDATE()  -- Thời gian đăng nhập
);

/* ==========================
   BẢNG BÀI ĐĂNG & BÌNH LUẬN (THÊM PostMedia CHO MULTIPLE MEDIA)
   Phần này tạo bảng cho bài đăng, media (nhiều ảnh/video), like và comment
========================== */
-- Tạo bảng Posts: Lưu thông tin bài đăng chính (không lưu media trực tiếp)
CREATE TABLE Posts (
    post_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    user_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Người tạo bài (user thường; admin có thể tạo nếu cần mở rộng)
    caption NVARCHAR(500),  -- Mô tả/caption (có thể rỗng)
    location NVARCHAR(255),  -- Vị trí gắn tag (có thể rỗng)
    privacy NVARCHAR(20) DEFAULT 'public',  -- Quyền riêng tư ('public', 'private', 'followers')
    is_visible BIT DEFAULT 1,  -- Cờ hiển thị (1=hiện, 0=ẩn tạm thời do moderation)
    created_at DATETIME DEFAULT GETDATE()  -- Thời gian tạo bài
);

-- Tạo bảng PostMedia: Hỗ trợ nhiều media (ảnh/video) cho một bài đăng (one-to-many)
CREATE TABLE PostMedia (
    media_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    post_id INT NOT NULL FOREIGN KEY REFERENCES Posts(post_id) ON DELETE CASCADE,  -- Liên kết bài đăng, xóa cascade
    media_url NVARCHAR(500) NOT NULL,  -- Đường dẫn/URL media từ Azure Blob (bắt buộc)
    media_type NVARCHAR(20) NOT NULL CHECK (media_type IN ('Image', 'Video')),  -- Loại media ('Image' hoặc 'Video'), ràng buộc CHECK
    media_order INT DEFAULT 0,  -- Thứ tự hiển thị trong carousel (mặc định 0)
    duration INT NULL,  -- Thời lượng video (giây, rỗng cho ảnh)
    created_at DATETIME DEFAULT GETDATE()  -- Thời gian upload media
);

-- Tạo ràng buộc unique: Chỉ cho phép tối đa 1 video per post
CREATE UNIQUE INDEX UIX_PostMedia_OneVideo ON PostMedia (post_id) WHERE media_type = 'Video';

-- Tạo index trên post_id để lấy media theo bài đăng nhanh
CREATE INDEX IX_PostMedia_PostId ON PostMedia (post_id);

-- Tạo bảng PostLikes: Lưu lượt thích bài đăng
CREATE TABLE PostLikes (
    like_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    post_id INT FOREIGN KEY REFERENCES Posts(post_id),  -- Bài đăng được like
    user_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Người like (user thường)
    created_at DATETIME DEFAULT GETDATE(),  -- Thời gian like
    UNIQUE(post_id, user_id)  -- Ràng buộc tránh like trùng lặp
);

-- Tạo index trên post_id để count like theo bài nhanh
CREATE INDEX IX_PostLikes_PostId ON PostLikes (post_id);
-- Tạo index trên user_id để lấy lịch sử like của user
CREATE INDEX IX_PostLikes_UserId ON PostLikes (user_id);

-- Tạo bảng Comments: Lưu bình luận (hỗ trợ nested reply)
CREATE TABLE Comments (
    comment_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    post_id INT FOREIGN KEY REFERENCES Posts(post_id),  -- Bài đăng liên kết
    user_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Người comment (user thường)
    parent_comment_id INT NULL,  -- ID bình luận cha (NULL nếu bình luận gốc, hỗ trợ reply)
    content NVARCHAR(500),  -- Nội dung bình luận (có thể rỗng)
    is_visible BIT DEFAULT 1,  -- Cờ hiển thị (cho moderation)
    created_at DATETIME DEFAULT GETDATE(),  -- Thời gian comment
    FOREIGN KEY (parent_comment_id) REFERENCES Comments(comment_id)  -- Self-FK cho nested comments
);

-- Tạo index ghép trên post_id và created_at (DESC) để lấy bình luận theo bài, sắp xếp thời gian
CREATE INDEX IX_Comments_PostId_Created ON Comments (post_id, created_at DESC);

-- Tạo bảng CommentLikes: Lưu lượt thích bình luận
CREATE TABLE CommentLikes (
    like_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    comment_id INT FOREIGN KEY REFERENCES Comments(comment_id),  -- Bình luận được like
    user_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Người like
    created_at DATETIME DEFAULT GETDATE(),  -- Thời gian like
    UNIQUE(comment_id, user_id)  -- Ràng buộc tránh like trùng
);

/* ==========================
   BẢNG THEO DÕI (FOLLOW)
   Phần này tạo bảng cho follow và close friends
========================== */
-- Tạo bảng Follows: Xây dựng social graph (mạng xã hội)
CREATE TABLE Follows (
    follow_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    follower_id INT FOREIGN KEY REFERENCES Users(user_id),  -- ID người theo dõi (user thường)
    following_id INT FOREIGN KEY REFERENCES Users(user_id),  -- ID người được theo dõi (user thường)
    status NVARCHAR(20) DEFAULT 'pending',  -- Trạng thái ('pending', 'accepted')
    created_at DATETIME DEFAULT GETDATE(),  -- Thời gian follow
    UNIQUE(follower_id, following_id)  -- Ràng buộc tránh follow trùng
);

-- Tạo index trên follower_id để lấy feed của người theo dõi nhanh
CREATE INDEX IX_Follows_Follower ON Follows (follower_id);
-- Tạo index trên following_id để lấy danh sách người theo dõi nhanh
CREATE INDEX IX_Follows_Following ON Follows (following_id);

-- Tạo bảng CloseFriends: Danh sách bạn thân cho privacy story
CREATE TABLE CloseFriends (
    id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    user_id INT FOREIGN KEY REFERENCES Users(user_id),  -- ID user
    friend_id INT FOREIGN KEY REFERENCES Users(user_id),  -- ID bạn thân
    created_at DATETIME DEFAULT GETDATE(),  -- Thời gian thêm
    UNIQUE(user_id, friend_id)  -- Ràng buộc tránh trùng
);

/* ==========================
   BẢNG STORIES
   Phần này tạo bảng cho story và lượt xem
========================== */
-- Tạo bảng Stories: Lưu story tạm thời (24h)
CREATE TABLE Stories (
    story_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    user_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Người tạo story (user thường)
    media_url NVARCHAR(255) NOT NULL,  -- URL media story (bắt buộc)
    privacy NVARCHAR(20) DEFAULT 'public',  -- Quyền ('public', 'close_friends')
    created_at DATETIME DEFAULT GETDATE(),  -- Thời gian tạo
    expires_at DATETIME  -- Thời gian hết hạn (e.g., +24h)
);

-- Tạo index ghép trên user_id và created_at (DESC) để lấy story theo user
CREATE INDEX IX_Stories_UserId_Created ON Stories (user_id, created_at DESC);
-- Tạo index trên expires_at để xóa story hết hạn (cron job)
CREATE INDEX IX_Stories_Expires ON Stories (expires_at);

-- Tạo bảng StoryViews: Lưu lượt xem story
CREATE TABLE StoryViews (
    id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    story_id INT FOREIGN KEY REFERENCES Stories(story_id),  -- Story được xem
    viewer_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Người xem (user thường)
    viewed_at DATETIME DEFAULT GETDATE(),  -- Thời gian xem
    UNIQUE(story_id, viewer_id)  -- Ràng buộc tránh xem trùng
);

/* ==========================
   BẢNG TIN NHẮN & CHAT
   Phần này tạo bảng cho phòng chat, thành viên và tin nhắn
========================== */
-- Tạo bảng Conversations: Quản lý phòng chat (1-1 hoặc group)
CREATE TABLE Conversations (
    conversation_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    is_group BIT DEFAULT 0,  -- Cờ group chat (0=1-1, 1=group)
    name NVARCHAR(100),  -- Tên phòng (cho group, có thể rỗng)
    avatar_url NVARCHAR(255),  -- Ảnh đại diện phòng (có thể rỗng)
    created_at DATETIME DEFAULT GETDATE()  -- Thời gian tạo phòng
);

-- Tạo bảng ConversationMembers: Quản lý thành viên và quyền trong phòng chat
CREATE TABLE ConversationMembers (
    id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    conversation_id INT FOREIGN KEY REFERENCES Conversations(conversation_id),  -- Phòng chat
    user_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Thành viên (user thường)
    role NVARCHAR(20) DEFAULT 'member',  -- Vai trò ('member', 'admin')
    joined_at DATETIME DEFAULT GETDATE(),  -- Thời gian tham gia
    UNIQUE(conversation_id, user_id)  -- Ràng buộc tránh thành viên trùng
);

-- Tạo index trên conversation_id để lấy thành viên theo phòng nhanh
CREATE INDEX IX_ConversationMembers_ConvId ON ConversationMembers (conversation_id);

-- Tạo bảng Messages: Lưu tin nhắn chat real-time
CREATE TABLE Messages (
    message_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    conversation_id INT FOREIGN KEY REFERENCES Conversations(conversation_id),  -- Phòng chat
    sender_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Người gửi (user thường)
    content NVARCHAR(1000),  -- Nội dung text (có thể rỗng nếu media)
    media_url NVARCHAR(255),  -- URL media (có thể rỗng)
    message_type NVARCHAR(20) DEFAULT 'text',  -- Loại tin ('text', 'image', 'video', 'voice')
    status NVARCHAR(20) DEFAULT 'sent',  -- Trạng thái ('sent', 'delivered', 'read')
    reply_to INT NULL,  -- ID tin được reply (self-FK)
    created_at DATETIME DEFAULT GETDATE(),  -- Thời gian gửi
    FOREIGN KEY (reply_to) REFERENCES Messages(message_id)  -- Self-FK cho reply
);

-- Tạo index ghép trên conversation_id và created_at (DESC) để load tin nhắn theo thời gian
CREATE INDEX IX_Messages_ConvId_Created ON Messages (conversation_id, created_at DESC);

/* ==========================
   BẢNG TÌM KIẾM & HASHTAGS
   Phần này tạo bảng cho hashtag và lịch sử tìm kiếm
========================== */
-- Tạo bảng Hashtags: Lưu hashtag độc lập
CREATE TABLE Hashtags (
    hashtag_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    name NVARCHAR(50) UNIQUE NOT NULL  -- Tên hashtag (e.g., '#instagram', bắt buộc và duy nhất)
);

-- Tạo bảng PostHashtags: Liên kết many-to-many giữa post và hashtag
CREATE TABLE PostHashtags (
    id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    post_id INT FOREIGN KEY REFERENCES Posts(post_id),  -- Bài đăng
    hashtag_id INT FOREIGN KEY REFERENCES Hashtags(hashtag_id),  -- Hashtag
    UNIQUE(post_id, hashtag_id)  -- Ràng buộc tránh gắn trùng
);

-- Tạo index trên post_id để lấy hashtag theo bài nhanh
CREATE INDEX IX_PostHashtags_PostId ON PostHashtags (post_id);

-- Tạo bảng SearchHistory: Lưu lịch sử tìm kiếm của user
CREATE TABLE SearchHistory (
    id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    user_id INT FOREIGN KEY REFERENCES Users(user_id),  -- User tìm kiếm
    keyword NVARCHAR(100),  -- Từ khóa tìm (có thể rỗng)
    searched_at DATETIME DEFAULT GETDATE()  -- Thời gian tìm kiếm
);

-- Tạo index trên user_id để lấy lịch sử theo user nhanh
CREATE INDEX IX_SearchHistory_UserId ON SearchHistory (user_id);

/* ==========================
   BẢNG THÔNG BÁO (THÊM CONTENT)
   Phần này tạo bảng cho thông báo in-app/push
========================== */
-- Tạo bảng Notifications: Quản lý thông báo (like, comment, follow...)
CREATE TABLE Notifications (
    notification_id INT IDENTITY PRIMARY KEY,  -- ID tự tăng, khóa chính
    user_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Người nhận thông báo (user thường)
    sender_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Người tạo hành động (user thường)
    type NVARCHAR(50),  -- Loại thông báo ('like', 'comment', 'follow'...)
    reference_id INT,  -- ID liên quan (post_id, comment_id..., có thể rỗng)
    content NVARCHAR(500) NOT NULL,  -- Nội dung chi tiết thông báo (bắt buộc, e.g., "Bạn có like mới")
    is_read BIT DEFAULT 0,  -- Cờ đã đọc (0=chưa)
    created_at DATETIME DEFAULT GETDATE()  -- Thời gian tạo
);

-- Tạo index ghép trên user_id và is_read để lấy thông báo chưa đọc nhanh
CREATE INDEX IX_Notifications_UserId_IsRead ON Notifications (user_id, is_read);
-- Tạo index trên created_at (DESC) để sắp xếp thông báo theo thời gian
CREATE INDEX IX_Notifications_Created ON Notifications (created_at DESC);

/* ==========================
   BẢNG AI MODERATION (CHỈNH FK SANG ACCOUNTS)
   Phần này tạo bảng cho kiểm duyệt nội dung AI và nhật ký
========================== */
-- Tạo bảng ContentModeration: Lưu kết quả phân tích AI (vi phạm nội dung)
CREATE TABLE ContentModeration (
    ModerationID INT PRIMARY KEY IDENTITY(1,1),  -- ID tự tăng, khóa chính
    ContentType NVARCHAR(20) NOT NULL,  -- Loại nội dung ('Post' hoặc 'Comment')
    ContentID INT NOT NULL,  -- ID nội dung (post hoặc comment)
    account_id INT NOT NULL,  -- Tài khoản tạo nội dung (FK Accounts)
    post_id INT NULL FOREIGN KEY REFERENCES Posts(post_id),  -- FK cụ thể cho post (NULL nếu comment)
    comment_id INT NULL FOREIGN KEY REFERENCES Comments(comment_id),  -- FK cụ thể cho comment (NULL nếu post)
    AIConfidence FLOAT NOT NULL,  -- Độ tin cậy AI (0.0-1.0)
    ToxicLabel NVARCHAR(50) NOT NULL,  -- Nhãn vi phạm ('toxic', 'spam', 'hate'...)
    Status NVARCHAR(20) DEFAULT 'Pending',  -- Trạng thái ('Pending', 'Reviewed', 'Approved', 'Blocked')
    CreatedAt DATETIME DEFAULT GETDATE(),  -- Thời gian phân tích AI
    FOREIGN KEY (account_id) REFERENCES Accounts(account_id),  -- FK tài khoản
    CONSTRAINT CK_ContentModeration_OneID CHECK (  -- Ràng buộc CHECK: Chỉ 1 FK cụ thể không NULL
        (ContentType = 'Post' AND post_id IS NOT NULL AND comment_id IS NULL) OR
        (ContentType = 'Comment' AND comment_id IS NOT NULL AND post_id IS NULL)
    )
);

-- Tạo bảng ModerationLogs: Lưu nhật ký hành động xử lý moderation (audit trail)
CREATE TABLE ModerationLogs (
    LogID INT PRIMARY KEY IDENTITY(1,1),  -- ID tự tăng, khóa chính
    ModerationID INT NOT NULL,  -- FK liên kết với ContentModeration
    ActionTaken NVARCHAR(50) NOT NULL,  -- Hành động ('Auto-Blocked', 'Approved', 'Deleted'...)
    AdminID INT NULL,  -- ID admin thực hiện (NULL nếu tự động)
    ActionAt DATETIME DEFAULT GETDATE(),  -- Thời gian hành động
    Note NVARCHAR(255) NULL,  -- Ghi chú chi tiết (có thể rỗng)
    FOREIGN KEY (ModerationID) REFERENCES ContentModeration(ModerationID),  -- FK moderation
    FOREIGN KEY (AdminID) REFERENCES Admins(admin_id)  -- FK admin
);

/* ==========================
   INDEX THÊM CHO HIỆU SUẤT CHUNG
   Phần này thêm index cho các query thường dùng (feed, privacy)
========================== */
-- Tạo index ghép trên user_id và created_at (DESC) cho feed/profile bài đăng
CREATE INDEX IX_Posts_UserId_Created ON Posts (user_id, created_at DESC);
-- Tạo index trên privacy để lọc theo quyền riêng tư nhanh
CREATE INDEX IX_Posts_Privacy ON Posts (privacy);
GO  -- Kết thúc batch cuối cùng