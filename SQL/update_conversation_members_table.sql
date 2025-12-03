-- Thêm cột last_read_message_id nếu chưa có
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('ConversationMembers') 
    AND name = 'last_read_message_id'
)
BEGIN
    ALTER TABLE ConversationMembers ADD last_read_message_id INT NULL
    PRINT 'Added column last_read_message_id to ConversationMembers'
END
ELSE
BEGIN
    PRINT 'Column last_read_message_id already exists in ConversationMembers'
END

-- Thêm cột last_read_at nếu chưa có
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('ConversationMembers') 
    AND name = 'last_read_at'
)
BEGIN
    ALTER TABLE ConversationMembers ADD last_read_at DATETIME2 NULL
    PRINT 'Added column last_read_at to ConversationMembers'
END
ELSE
BEGIN
    PRINT 'Column last_read_at already exists in ConversationMembers'
END

-- Kiểm tra kết quả
SELECT TOP 5 * FROM ConversationMembers
