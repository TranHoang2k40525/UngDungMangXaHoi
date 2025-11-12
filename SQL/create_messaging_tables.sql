-- Create ConversationsNew table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ConversationsNew')
BEGIN
    CREATE TABLE [ConversationsNew] (
        [conversation_id] int NOT NULL IDENTITY,
        [user1_id] int NOT NULL,
        [user2_id] int NOT NULL,
        [created_at] datetime2 NOT NULL DEFAULT (GETDATE()),
        [updated_at] datetime2 NOT NULL DEFAULT (GETDATE()),
        CONSTRAINT [PK_ConversationsNew] PRIMARY KEY ([conversation_id]),
        CONSTRAINT [FK_ConversationsNew_Users_user1_id] FOREIGN KEY ([user1_id]) REFERENCES [Users] ([user_id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ConversationsNew_Users_user2_id] FOREIGN KEY ([user2_id]) REFERENCES [Users] ([user_id]) ON DELETE NO ACTION
    );
    
    CREATE INDEX [IX_ConversationsNew_user1_id] ON [ConversationsNew] ([user1_id]);
    CREATE INDEX [IX_ConversationsNew_user2_id] ON [ConversationsNew] ([user2_id]);
    CREATE UNIQUE INDEX [IX_ConversationsNew_Users] ON [ConversationsNew] ([user1_id], [user2_id]);
    
    PRINT 'ConversationsNew table created successfully';
END
ELSE
BEGIN
    PRINT 'ConversationsNew table already exists';
END
GO

-- Create MessagesNew table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MessagesNew')
BEGIN
    CREATE TABLE [MessagesNew] (
        [message_id] int NOT NULL IDENTITY,
        [conversation_id] int NOT NULL,
        [sender_id] int NOT NULL,
        [content] nvarchar(max) NULL,
        [message_type] nvarchar(20) NOT NULL DEFAULT N'Text',
        [status] nvarchar(20) NOT NULL DEFAULT N'Sent',
        [media_url] nvarchar(500) NULL,
        [is_deleted] bit NOT NULL DEFAULT 0,
        [created_at] datetime2 NOT NULL DEFAULT (GETDATE()),
        [read_at] datetime2 NULL,
        CONSTRAINT [PK_MessagesNew] PRIMARY KEY ([message_id]),
        CONSTRAINT [FK_MessagesNew_ConversationsNew_conversation_id] FOREIGN KEY ([conversation_id]) REFERENCES [ConversationsNew] ([conversation_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_MessagesNew_Users_sender_id] FOREIGN KEY ([sender_id]) REFERENCES [Users] ([user_id]) ON DELETE NO ACTION
    );
    
    CREATE INDEX [IX_MessagesNew_conversation_id] ON [MessagesNew] ([conversation_id]);
    CREATE INDEX [IX_MessagesNew_sender_id] ON [MessagesNew] ([sender_id]);
    CREATE INDEX [IX_MessagesNew_created_at] ON [MessagesNew] ([created_at]);
    
    PRINT 'MessagesNew table created successfully';
END
ELSE
BEGIN
    PRINT 'MessagesNew table already exists';
END
GO

PRINT 'All messaging tables are ready!';
