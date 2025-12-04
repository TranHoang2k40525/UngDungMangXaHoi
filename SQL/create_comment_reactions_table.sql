-- Tạo bảng CommentReactions nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CommentReactions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CommentReactions](
        [comment_reaction_id] [int] IDENTITY(1,1) NOT NULL,
        [comment_id] [int] NOT NULL,
        [account_id] [int] NOT NULL,
        [reaction_type] [nvarchar](20) NOT NULL,
        [created_at] [datetime2](7) NOT NULL,
     CONSTRAINT [PK__CommentR__0F7A9DF9A78B1FCF] PRIMARY KEY CLUSTERED 
    (
        [comment_reaction_id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
    ) ON [PRIMARY]

    -- Add default constraints
    ALTER TABLE [dbo].[CommentReactions] ADD CONSTRAINT [DF__CommentRe__react__6E8B6712] DEFAULT ('Like') FOR [reaction_type]
    ALTER TABLE [dbo].[CommentReactions] ADD CONSTRAINT [DF__CommentRe__creat__6F7F8B4B] DEFAULT (getutcdate()) FOR [created_at]

    -- Add foreign keys
    ALTER TABLE [dbo].[CommentReactions] WITH CHECK ADD CONSTRAINT [FK_CommentReactions_Accounts] FOREIGN KEY([account_id])
    REFERENCES [dbo].[Accounts] ([account_id])

    ALTER TABLE [dbo].[CommentReactions] CHECK CONSTRAINT [FK_CommentReactions_Accounts]

    ALTER TABLE [dbo].[CommentReactions] WITH CHECK ADD CONSTRAINT [FK_CommentReactions_Comments] FOREIGN KEY([comment_id])
    REFERENCES [dbo].[Comments] ([comment_id])
    ON DELETE CASCADE

    ALTER TABLE [dbo].[CommentReactions] CHECK CONSTRAINT [FK_CommentReactions_Comments]

    PRINT 'Bảng CommentReactions đã được tạo thành công!'
END
ELSE
BEGIN
    PRINT 'Bảng CommentReactions đã tồn tại.'
END
