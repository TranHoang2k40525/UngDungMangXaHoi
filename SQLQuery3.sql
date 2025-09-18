-- Tạo database
CREATE DATABASE ungdungmangxahoi;
GO

USE ungdungmangxahoi;
GO

/* ==========================
   BẢNG NGƯỜI DÙNG & XÁC THỰC
========================== */
CREATE TABLE Users (
    user_id INT IDENTITY PRIMARY KEY,
    username NVARCHAR(50) UNIQUE NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    phone NVARCHAR(20) UNIQUE NULL,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(100),
    bio NVARCHAR(255),
    website NVARCHAR(255),
    avatar_url NVARCHAR(255),
    is_private BIT DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'active', -- active, deactivated, banned
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE RefreshTokens (
    token_id INT IDENTITY PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(user_id),
    refresh_token NVARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE LoginHistory (
    history_id INT IDENTITY PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(user_id),
    ip_address NVARCHAR(50),
    device_info NVARCHAR(100),
    login_time DATETIME DEFAULT GETDATE()
);

/* ==========================
   BẢNG BÀI ĐĂNG & BÌNH LUẬN
========================== */
CREATE TABLE Posts (
    post_id INT IDENTITY PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(user_id),
    media_url NVARCHAR(255) NOT NULL,
    caption NVARCHAR(500),
    location NVARCHAR(255),
    privacy NVARCHAR(20) DEFAULT 'public', -- public, private, followers
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE PostLikes (
    like_id INT IDENTITY PRIMARY KEY,
    post_id INT FOREIGN KEY REFERENCES Posts(post_id),
    user_id INT FOREIGN KEY REFERENCES Users(user_id),
    created_at DATETIME DEFAULT GETDATE(),
    UNIQUE(post_id, user_id)
);

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
    follower_id INT FOREIGN KEY REFERENCES Users(user_id),
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
   BẢNG THÔNG BÁO
========================== */
CREATE TABLE Notifications (
    notification_id INT IDENTITY PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(user_id), -- ai nhận thông báo
    sender_id INT FOREIGN KEY REFERENCES Users(user_id), -- ai tạo thông báo
    type NVARCHAR(50), -- like, comment, follow, message, story
    reference_id INT, -- id liên quan (post_id, comment_id...)
    is_read BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

/* ==========================
   BẢNG AI MODERATION
========================== */
CREATE TABLE ContentModeration (
    ModerationID INT PRIMARY KEY IDENTITY(1,1),
    ContentType NVARCHAR(20) NOT NULL,     -- 'Post' hoặc 'Comment'
    ContentID INT NOT NULL,                -- ID của bài viết hoặc comment
    user_id INT NOT NULL,                  -- Người tạo nội dung
    AIConfidence FLOAT NOT NULL,           -- Mức độ tin cậy của AI
    ToxicLabel NVARCHAR(50) NOT NULL,      -- 'toxic', 'spam', 'hate', ...
    Status NVARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Reviewed', 'Approved', 'Blocked'
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
GO

CREATE TABLE ModerationLogs (
    LogID INT PRIMARY KEY IDENTITY(1,1),
    ModerationID INT NOT NULL,
    ActionTaken NVARCHAR(50) NOT NULL,     -- 'Auto-Blocked', 'Approved', 'Deleted', 'Warned User'
    AdminID INT NULL,                      -- Người quản trị thực hiện (nếu có)
    ActionAt DATETIME DEFAULT GETDATE(),
    Note NVARCHAR(255) NULL,
    FOREIGN KEY (ModerationID) REFERENCES ContentModeration(ModerationID),
    FOREIGN KEY (AdminID) REFERENCES Users(user_id)
);
GO
