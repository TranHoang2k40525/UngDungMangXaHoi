-- Migration: Thêm conversation_id và message_id vào bảng Notifications
-- Ngày: 2025-12-02
-- Mục đích: Hỗ trợ điều hướng chính xác đến tin nhắn nhóm khi nhấn vào thông báo

-- Thêm cột conversation_id để lưu ID nhóm chat cho thông báo nhóm
ALTER TABLE Notifications
ADD conversation_id INT NULL;

-- Thêm cột message_id để lưu ID tin nhắn cụ thể
ALTER TABLE Notifications
ADD message_id INT NULL;

-- Thêm foreign key constraint cho conversation_id (tùy chọn)
-- ALTER TABLE Notifications
-- ADD CONSTRAINT FK_Notifications_Conversations
-- FOREIGN KEY (conversation_id) REFERENCES Conversations(id);

-- Thêm index để tăng tốc truy vấn
CREATE INDEX IX_Notifications_ConversationId ON Notifications(conversation_id);
CREATE INDEX IX_Notifications_MessageId ON Notifications(message_id);

PRINT 'Migration completed: Added conversation_id and message_id to Notifications table';
