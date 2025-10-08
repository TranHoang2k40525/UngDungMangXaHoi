-- Tạo database
CREATE DATABASE ungdungmangxahoi;
GO

USE ungdungmangxahoi;
GO

/* ==========================
   BẢNG TÀI KHOẢN CHUNG & XÁC THỰC
========================== */
-- Bảng Accounts: Chung cho tất cả loại tài khoản (Admin/User)
CREATE TABLE Accounts (
    account_id INT IDENTITY PRIMARY KEY,
    username NVARCHAR(50) UNIQUE NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    phone NVARCHAR(20) UNIQUE NULL,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(100),
    website NVARCHAR(255),
    status NVARCHAR(20) DEFAULT 'active', -- active, deactivated, banned
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    account_type NVARCHAR(20) NOT NULL CHECK (account_type IN ('Admin', 'User'))  -- Phân loại loại tài khoản
);

-- Bảng Users: Dành cho người dùng thường (extend Accounts)
CREATE TABLE Users (
    user_id INT IDENTITY PRIMARY KEY,
    account_id INT NOT NULL FOREIGN KEY REFERENCES Accounts(account_id) ON DELETE CASCADE,
    bio NVARCHAR(255),
    avatar_url NVARCHAR(255),
    is_private BIT DEFAULT 0
);

-- Bảng Admins: Dành cho admin (extend Accounts)
CREATE TABLE Admins (
    admin_id INT IDENTITY PRIMARY KEY,
    account_id INT NOT NULL FOREIGN KEY REFERENCES Accounts(account_id) ON DELETE CASCADE,
    admin_level NVARCHAR(20) DEFAULT 'moderator'  -- super_admin, moderator, etc.
);

-- Bảng OTPs: Quản lý OTP cho đổi/quên mật khẩu
CREATE TABLE OTPs (
    otp_id INT IDENTITY PRIMARY KEY,
    account_id INT NOT NULL FOREIGN KEY REFERENCES Accounts(account_id),
    otp_hash NVARCHAR(255) NOT NULL,  -- OTP hashed (e.g., bcrypt)
    purpose NVARCHAR(50) NOT NULL,    -- 'forgot_password' hoặc 'change_password'
    expires_at DATETIME NOT NULL,     -- Hết hạn sau 5-10 phút
    used BIT DEFAULT 0,               -- Đã sử dụng chưa
    created_at DATETIME DEFAULT GETDATE()
);

-- Index cho OTP verify nhanh ( tăng tốc độ truy cập otp)
CREATE INDEX IX_OTPs_AccountId_Hash ON OTPs (account_id, otp_hash);

-- Bảng RefreshTokens: Chỉnh FK sang Accounts
CREATE TABLE RefreshTokens (
    token_id INT IDENTITY PRIMARY KEY,
    account_id INT FOREIGN KEY REFERENCES Accounts(account_id),
    refresh_token NVARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Bảng LoginHistory: Chỉnh FK sang Accounts
CREATE TABLE LoginHistory (
    history_id INT IDENTITY PRIMARY KEY,
    account_id INT FOREIGN KEY REFERENCES Accounts(account_id),
    ip_address NVARCHAR(50),
    device_info NVARCHAR(100),
    login_time DATETIME DEFAULT GETDATE()
);

/* ==========================
   BẢNG BÀI ĐĂNG & BÌNH LUẬN
========================== */
-- Bảng Posts: FK user_id sang Users (admin có thể tạo qua Users nếu cần)
CREATE TABLE Posts (
    post_id INT IDENTITY PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Chỉ user thường tạo post; nếu admin cần, thêm admin_id
    media_url NVARCHAR(255) NOT NULL,
    caption NVARCHAR(500),
    location NVARCHAR(255),
    privacy NVARCHAR(20) DEFAULT 'public', -- public, private, followers
	is_visible BIT DEFAULT 1,  -- Thêm cho moderation (ẩn khi vi phạm)
    created_at DATETIME DEFAULT GETDATE()
);

-- Bảng PostMedia: Hỗ trợ nhiều ảnh/video (one-to-many với Posts)
CREATE TABLE PostMedia (
    media_id INT IDENTITY PRIMARY KEY,
    post_id INT NOT NULL FOREIGN KEY REFERENCES Posts(post_id) ON DELETE CASCADE,
    media_url NVARCHAR(500) NOT NULL,  -- Path/URL từ Azure Blob
    media_type NVARCHAR(20) NOT NULL CHECK (media_type IN ('Image', 'Video')),  -- Phân biệt
    media_order INT DEFAULT 0,  -- Thứ tự carousel
    duration INT NULL,  -- Thời lượng giây (cho video)
    created_at DATETIME DEFAULT GETDATE()
);

-- Ràng buộc: Tối đa 1 video/post
CREATE UNIQUE INDEX UIX_PostMedia_OneVideo ON PostMedia (post_id) WHERE media_type = 'Video';

-- Index cho PostMedia
CREATE INDEX IX_PostMedia_PostId ON PostMedia (post_id);

CREATE TABLE PostLikes (
    like_id INT IDENTITY PRIMARY KEY,
    post_id INT FOREIGN KEY REFERENCES Posts(post_id),
    user_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Người like là user
    created_at DATETIME DEFAULT GETDATE(),
    UNIQUE(post_id, user_id)
);

-- Index cho PostLikes
CREATE INDEX IX_PostLikes_PostId ON PostLikes (post_id);
CREATE INDEX IX_PostLikes_UserId ON PostLikes (user_id);

CREATE TABLE Comments (
    comment_id INT IDENTITY PRIMARY KEY,
    post_id INT FOREIGN KEY REFERENCES Posts(post_id),
    user_id INT FOREIGN KEY REFERENCES Users(user_id),
    parent_comment_id INT NULL,
    content NVARCHAR(500),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (parent_comment_id) REFERENCES Comments(comment_id)
);

CREATE TABLE CommentLikes (
    like_id INT IDENTITY PRIMARY KEY,
    comment_id INT FOREIGN KEY REFERENCES Comments(comment_id),
    user_id INT FOREIGN KEY REFERENCES Users(user_id),
    created_at DATETIME DEFAULT GETDATE(),
    UNIQUE(comment_id, user_id)
);

/* ==========================
   BẢNG THEO DÕI (FOLLOW)
========================== */
CREATE TABLE Follows (
    follow_id INT IDENTITY PRIMARY KEY,
    follower_id INT FOREIGN KEY REFERENCES Users(user_id),  -- Chỉ user follow
    following_id INT FOREIGN KEY REFERENCES Users(user_id),
    status NVARCHAR(20) DEFAULT 'pending', -- pending, accepted
    created_at DATETIME DEFAULT GETDATE(),
    UNIQUE(follower_id, following_id)
);

CREATE TABLE CloseFriends (
    id INT IDENTITY PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(user_id),
    friend_id INT FOREIGN KEY REFERENCES Users(user_id),
    created_at DATETIME DEFAULT GETDATE(),
    UNIQUE(user_id, friend_id)
);

/* ==========================
   BẢNG STORIES
========================== */
CREATE TABLE Stories (
    story_id INT IDENTITY PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(user_id),
    media_url NVARCHAR(255) NOT NULL,
    privacy NVARCHAR(20) DEFAULT 'public', -- public, close_friends
    created_at DATETIME DEFAULT GETDATE(),
    expires_at DATETIME
);

CREATE TABLE StoryViews (
    id INT IDENTITY PRIMARY KEY,
    story_id INT FOREIGN KEY REFERENCES Stories(story_id),
    viewer_id INT FOREIGN KEY REFERENCES Users(user_id),
    viewed_at DATETIME DEFAULT GETDATE(),
    UNIQUE(story_id, viewer_id)
);

/* ==========================
   BẢNG TIN NHẮN & CHAT
========================== */
CREATE TABLE Conversations (
    conversation_id INT IDENTITY PRIMARY KEY,
    is_group BIT DEFAULT 0,
    name NVARCHAR(100),
    avatar_url NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE ConversationMembers (
    id INT IDENTITY PRIMARY KEY,
    conversation_id INT FOREIGN KEY REFERENCES Conversations(conversation_id),
    user_id INT FOREIGN KEY REFERENCES Users(user_id),
    role NVARCHAR(20) DEFAULT 'member', -- member, admin
    joined_at DATETIME DEFAULT GETDATE(),
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE Messages (
    message_id INT IDENTITY PRIMARY KEY,
    conversation_id INT FOREIGN KEY REFERENCES Conversations(conversation_id),
    sender_id INT FOREIGN KEY REFERENCES Users(user_id),
    content NVARCHAR(1000),
    media_url NVARCHAR(255),
    message_type NVARCHAR(20) DEFAULT 'text', -- text, image, video, voice
    status NVARCHAR(20) DEFAULT 'sent', -- sent, delivered, read
    reply_to INT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (reply_to) REFERENCES Messages(message_id)
);

/* ==========================
   BẢNG TÌM KIẾM & HASHTAGS
========================== */
CREATE TABLE Hashtags (
    hashtag_id INT IDENTITY PRIMARY KEY,
    name NVARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE PostHashtags (
    id INT IDENTITY PRIMARY KEY,
    post_id INT FOREIGN KEY REFERENCES Posts(post_id),
    hashtag_id INT FOREIGN KEY REFERENCES Hashtags(hashtag_id),
    UNIQUE(post_id, hashtag_id)
);

CREATE TABLE SearchHistory (
    id INT IDENTITY PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(user_id),
    keyword NVARCHAR(100),
    searched_at DATETIME DEFAULT GETDATE()
);

/* ==========================
   BẢNG THÔNG BÁO (THÊM CONTENT)
========================== */
CREATE TABLE Notifications (
    notification_id INT IDENTITY PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(user_id), -- ai nhận thông báo
    sender_id INT FOREIGN KEY REFERENCES Users(user_id), -- ai tạo thông báo
    type NVARCHAR(50), -- like, comment, follow, message, story
    reference_id INT, -- id liên quan (post_id, comment_id...)
    content NVARCHAR(500) NOT NULL,  -- Nội dung chi tiết thông báo (mới thêm)
    is_read BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

/* ==========================
   BẢNG AI MODERATION (CHỈNH FK SANG ACCOUNTS)
========================== */
CREATE TABLE ContentModeration (
    ModerationID INT PRIMARY KEY IDENTITY(1,1),
    ContentType NVARCHAR(20) NOT NULL,     -- 'Post' hoặc 'Comment'
    ContentID INT NOT NULL,                -- ID của bài viết hoặc comment
    account_id INT NOT NULL,               -- Người tạo nội dung (FK Accounts thay vì Users)
    AIConfidence FLOAT NOT NULL,           -- Mức độ tin cậy của AI
    ToxicLabel NVARCHAR(50) NOT NULL,      -- 'toxic', 'spam', 'hate', ...
    Status NVARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Reviewed', 'Approved', 'Blocked'
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (account_id) REFERENCES Accounts(account_id)
);

CREATE TABLE ModerationLogs (
    LogID INT PRIMARY KEY IDENTITY(1,1),
    ModerationID INT NOT NULL,
    ActionTaken NVARCHAR(50) NOT NULL,     -- 'Auto-Blocked', 'Approved', 'Deleted', 'Warned User'
    AdminID INT NULL,                      -- ID admin (FK Admins.admin_id)
    ActionAt DATETIME DEFAULT GETDATE(),
    Note NVARCHAR(255) NULL,
    FOREIGN KEY (ModerationID) REFERENCES ContentModeration(ModerationID),
    FOREIGN KEY (AdminID) REFERENCES Admins(admin_id)
);
GO

-- Index cho Accounts (tăng tốc độ truy cập )
CREATE INDEX IX_Accounts_AccountType ON Accounts(account_type);
CREATE INDEX IX_Accounts_Username ON Accounts(username);