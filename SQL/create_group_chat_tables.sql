-- Tạo bảng GroupConversations (Conversations) cho group chat
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Conversations')
BEGIN
    CREATE TABLE [Conversations] (
        [conversation_id] int NOT NULL IDENTITY(1,1),
        [is_group] bit NOT NULL DEFAULT 0,
        [name] nvarchar(200) NULL,
        [avatar_url] nvarchar(500) NULL,
        [created_at] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [created_by] int NOT NULL,
        [invite_permission] nvarchar(20) NOT NULL DEFAULT 'all',
        [max_members] int NULL,
        CONSTRAINT [PK_Conversations] PRIMARY KEY ([conversation_id]),
        CONSTRAINT [FK_Conversations_Users_created_by] FOREIGN KEY ([created_by]) REFERENCES [Users] ([user_id]) ON DELETE NO ACTION
    )
    
    CREATE INDEX [IX_Conversations_created_by] ON [Conversations] ([created_by])
    CREATE INDEX [IX_Conversations_is_group] ON [Conversations] ([is_group])
    
    PRINT 'Conversations table created successfully'
END
ELSE
BEGIN
    PRINT 'Conversations table already exists'
END

-- Tạo bảng ConversationMembers cho thành viên nhóm
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ConversationMembers')
BEGIN
    CREATE TABLE [ConversationMembers] (
        [id] int NOT NULL IDENTITY(1,1),
        [conversation_id] int NOT NULL,
        [user_id] int NOT NULL,
        [role] nvarchar(20) NOT NULL DEFAULT 'member',
        [joined_at] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [last_read_message_id] int NULL,
        [last_read_at] datetime2 NULL,
        CONSTRAINT [PK_ConversationMembers] PRIMARY KEY ([id]),
        CONSTRAINT [FK_ConversationMembers_Conversations] FOREIGN KEY ([conversation_id]) REFERENCES [Conversations] ([conversation_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ConversationMembers_Users] FOREIGN KEY ([user_id]) REFERENCES [Users] ([user_id]) ON DELETE NO ACTION,
        CONSTRAINT [UQ_ConversationMembers_conversation_user] UNIQUE ([conversation_id], [user_id])
    )
    
    CREATE INDEX [IX_ConversationMembers_conversation_id] ON [ConversationMembers] ([conversation_id])
    CREATE INDEX [IX_ConversationMembers_user_id] ON [ConversationMembers] ([user_id])
    
    PRINT 'ConversationMembers table created successfully'
END
ELSE
BEGIN
    PRINT 'ConversationMembers table already exists'
END

-- Tạo bảng GroupMessages cho tin nhắn trong nhóm
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GroupMessages')
BEGIN
    CREATE TABLE [GroupMessages] (
        [message_id] int NOT NULL IDENTITY(1,1),
        [conversation_id] int NOT NULL,
        [sender_id] int NOT NULL,
        [content] nvarchar(max) NULL,
        [message_type] nvarchar(20) NOT NULL DEFAULT 'Text',
        [media_url] nvarchar(500) NULL,
        [is_deleted] bit NOT NULL DEFAULT 0,
        [is_pinned] bit NOT NULL DEFAULT 0,
        [created_at] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [updated_at] datetime2 NULL,
        [reply_to_message_id] int NULL,
        CONSTRAINT [PK_GroupMessages] PRIMARY KEY ([message_id]),
        CONSTRAINT [FK_GroupMessages_Conversations] FOREIGN KEY ([conversation_id]) REFERENCES [Conversations] ([conversation_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_GroupMessages_Users_sender] FOREIGN KEY ([sender_id]) REFERENCES [Users] ([user_id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_GroupMessages_ReplyTo] FOREIGN KEY ([reply_to_message_id]) REFERENCES [GroupMessages] ([message_id]) ON DELETE NO ACTION
    )
    
    CREATE INDEX [IX_GroupMessages_conversation_id] ON [GroupMessages] ([conversation_id])
    CREATE INDEX [IX_GroupMessages_sender_id] ON [GroupMessages] ([sender_id])
    CREATE INDEX [IX_GroupMessages_created_at] ON [GroupMessages] ([created_at])
    CREATE INDEX [IX_GroupMessages_reply_to] ON [GroupMessages] ([reply_to_message_id])
    
    PRINT 'GroupMessages table created successfully'
END
ELSE
BEGIN
    PRINT 'GroupMessages table already exists'
END

-- Tạo bảng GroupMessageReads để track ai đã đọc tin nhắn nào
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GroupMessageReads')
BEGIN
    CREATE TABLE [GroupMessageReads] (
        [id] int NOT NULL IDENTITY(1,1),
        [message_id] int NOT NULL,
        [user_id] int NOT NULL,
        [read_at] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_GroupMessageReads] PRIMARY KEY ([id]),
        CONSTRAINT [FK_GroupMessageReads_GroupMessages] FOREIGN KEY ([message_id]) REFERENCES [GroupMessages] ([message_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_GroupMessageReads_Users] FOREIGN KEY ([user_id]) REFERENCES [Users] ([user_id]) ON DELETE NO ACTION,
        CONSTRAINT [UQ_GroupMessageReads_message_user] UNIQUE ([message_id], [user_id])
    )
    
    CREATE INDEX [IX_GroupMessageReads_message_id] ON [GroupMessageReads] ([message_id])
    CREATE INDEX [IX_GroupMessageReads_user_id] ON [GroupMessageReads] ([user_id])
    
    PRINT 'GroupMessageReads table created successfully'
END
ELSE
BEGIN
    PRINT 'GroupMessageReads table already exists'
END

-- Tạo bảng GroupMessageReactions cho reaction trên tin nhắn nhóm
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GroupMessageReactions')
BEGIN
    CREATE TABLE [GroupMessageReactions] (
        [id] int NOT NULL IDENTITY(1,1),
        [message_id] int NOT NULL,
        [user_id] int NOT NULL,
        [reaction_type] int NOT NULL,
        [created_at] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_GroupMessageReactions] PRIMARY KEY ([id]),
        CONSTRAINT [FK_GroupMessageReactions_GroupMessages] FOREIGN KEY ([message_id]) REFERENCES [GroupMessages] ([message_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_GroupMessageReactions_Users] FOREIGN KEY ([user_id]) REFERENCES [Users] ([user_id]) ON DELETE NO ACTION,
        CONSTRAINT [UQ_GroupMessageReactions_message_user] UNIQUE ([message_id], [user_id])
    )
    
    CREATE INDEX [IX_GroupMessageReactions_message_id] ON [GroupMessageReactions] ([message_id])
    CREATE INDEX [IX_GroupMessageReactions_user_id] ON [GroupMessageReactions] ([user_id])
    
    PRINT 'GroupMessageReactions table created successfully'
END
ELSE
BEGIN
    PRINT 'GroupMessageReactions table already exists'
END

PRINT 'All group chat tables are ready!'
