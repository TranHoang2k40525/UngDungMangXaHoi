-- ============================================
-- DATABASE V4 - Clean RBAC Migration
-- Date: 2025-12-30
-- Changes: Removed account_type column
-- ============================================
USE [ungdungmangxahoiv_4]
GO
/****** Object:  DatabaseRole [db_app_admins]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE ROLE [db_app_admins]
GO
/****** Object:  UserDefinedFunction [dbo].[fn_IsBlockedBy]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE FUNCTION [dbo].[fn_IsBlockedBy](@ViewerId INT, @TargetId INT)
RETURNS BIT
AS
BEGIN
    DECLARE @res BIT = 0;
    IF EXISTS (SELECT 1 FROM dbo.Blocks WHERE blocker_id = @TargetId AND blocked_id = @ViewerId)
        SET @res = 1;
    RETURN @res;
END
GO
/****** Object:  Table [dbo].[Users]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[user_id] [int] IDENTITY(1,1) NOT NULL,
	[username] [nvarchar](50) NOT NULL,
	[account_id] [int] NOT NULL,
	[full_name] [nvarchar](100) NULL,
	[gender] [nvarchar](10) NULL,
	[bio] [nvarchar](255) NULL,
	[avatar_url] [nvarchar](max) NULL,
	[is_private] [bit] NULL,
	[date_of_birth] [date] NULL,
	[address] [nvarchar](255) NULL,
	[hometown] [nvarchar](255) NULL,
	[job] [nvarchar](255) NULL,
	[website] [nvarchar](255) NULL,
	[last_seen] [datetime] NULL,
 CONSTRAINT [PK__Users__B9BE370FCF7CD40C] PRIMARY KEY CLUSTERED 
(
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__Users__F3DBC572CFEA356C] UNIQUE NONCLUSTERED 
(
	[username] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Blocks]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Blocks](
	[block_id] [int] IDENTITY(1,1) NOT NULL,
	[blocker_id] [int] NOT NULL,
	[blocked_id] [int] NOT NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[block_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_Blocks_WithUserInfo]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[vw_Blocks_WithUserInfo]
AS
SELECT b.block_id, b.blocker_id, bu.username AS blocker_username, bu.full_name AS blocker_full_name,
       b.blocked_id, bu2.username AS blocked_username, bu2.full_name AS blocked_full_name,
       b.created_at
FROM dbo.Blocks b
LEFT JOIN dbo.Users bu ON bu.user_id = b.blocker_id
LEFT JOIN dbo.Users bu2 ON bu2.user_id = b.blocked_id;
GO
/****** Object:  Table [dbo].[__EFMigrationsHistory]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[__EFMigrationsHistory](
	[MigrationId] [nvarchar](150) NOT NULL,
	[ProductVersion] [nvarchar](32) NOT NULL,
 CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY CLUSTERED 
(
	[MigrationId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Accounts]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Accounts](
	[account_id] [int] IDENTITY(1,1) NOT NULL,
	[email] [nvarchar](100) NULL,
	[phone] [nvarchar](20) NULL,
	[password_hash] [nvarchar](255) NOT NULL,
	[status] [nvarchar](20) NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
	[business_verified_at] [datetime] NULL,
	[business_expires_at] [datetime] NULL,
 CONSTRAINT [PK__Accounts__46A222CD6E771C78] PRIMARY KEY CLUSTERED 
(
	[account_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__Accounts__AB6E6164DE841A1C] UNIQUE NONCLUSTERED 
(
	[email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__Accounts__B43B145F6867C24D] UNIQUE NONCLUSTERED 
(
	[phone] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[AccountSanctions]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AccountSanctions](
	[sanction_id] [int] IDENTITY(1,1) NOT NULL,
	[account_id] [int] NOT NULL,
	[admin_id] [int] NULL,
	[action_type] [nvarchar](50) NOT NULL,
	[reason] [nvarchar](1000) NULL,
	[start_at] [datetime] NOT NULL,
	[end_at] [datetime] NULL,
	[is_active] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[sanction_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[AdminActions]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AdminActions](
	[action_id] [int] IDENTITY(1,1) NOT NULL,
	[admin_id] [int] NULL,
	[action] [nvarchar](100) NOT NULL,
	[target_type] [nvarchar](50) NULL,
	[target_id] [int] NULL,
	[reason] [nvarchar](1000) NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[action_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Admins]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Admins](
	[admin_id] [int] IDENTITY(1,1) NOT NULL,
	[account_id] [int] NOT NULL,
	[full_name] [nvarchar](100) NULL,
	[gender] [nvarchar](10) NULL,
	[bio] [nvarchar](255) NULL,
	[avatar_url] [nvarchar](max) NULL,
	[is_private] [bit] NULL,
	[date_of_birth] [date] NULL,
	[address] [nvarchar](255) NULL,
	[hometown] [nvarchar](255) NULL,
	[job] [nvarchar](255) NULL,
	[website] [nvarchar](255) NULL,
	[admin_level] [nvarchar](20) NULL,
 CONSTRAINT [PK__Admins__43AA4141C9517ADE] PRIMARY KEY CLUSTERED 
(
	[admin_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Admins_account_id] UNIQUE NONCLUSTERED 
(
	[account_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[BusinessPayments]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[BusinessPayments](
	[payment_id] [int] IDENTITY(1,1) NOT NULL,
	[request_id] [int] NOT NULL,
	[account_id] [int] NOT NULL,
	[amount] [decimal](18, 2) NOT NULL,
	[payment_method] [nvarchar](50) NOT NULL,
	[qr_code_url] [nvarchar](500) NOT NULL,
	[transaction_id] [nvarchar](100) NOT NULL,
	[status] [nvarchar](20) NOT NULL,
	[created_at] [datetime] NOT NULL,
	[expires_at] [datetime] NOT NULL,
	[paid_at] [datetime] NULL,
 CONSTRAINT [PK_BusinessPayments] PRIMARY KEY CLUSTERED 
(
	[payment_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_BusinessPayments_TransactionId] UNIQUE NONCLUSTERED 
(
	[transaction_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[BusinessVerificationRequests]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[BusinessVerificationRequests](
	[request_id] [int] IDENTITY(1,1) NOT NULL,
	[account_id] [int] NOT NULL,
	[submitted_at] [datetime] NOT NULL,
	[status] [nvarchar](20) NOT NULL,
	[documents_url] [nvarchar](2000) NULL,
	[assigned_admin_id] [int] NULL,
	[reviewed_at] [datetime] NULL,
	[reviewed_notes] [nvarchar](1000) NULL,
	[expires_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[request_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[CloseFriends]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CloseFriends](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [int] NULL,
	[friend_id] [int] NULL,
	[created_at] [datetime] NULL,
 CONSTRAINT [PK__CloseFri__3213E83F4F900334] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__CloseFri__FA44291BA4C7B223] UNIQUE NONCLUSTERED 
(
	[user_id] ASC,
	[friend_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[CommentEditHistories]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CommentEditHistories](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[CommentId] [int] NOT NULL,
	[OldContent] [nvarchar](max) NOT NULL,
	[NewContent] [nvarchar](max) NOT NULL,
	[EditedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK__CommentE__3214EC07364BB018] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[CommentLikes]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CommentLikes](
	[like_id] [int] IDENTITY(1,1) NOT NULL,
	[comment_id] [int] NULL,
	[user_id] [int] NULL,
	[created_at] [datetime] NULL,
 CONSTRAINT [PK__CommentL__992C79304B5480D4] PRIMARY KEY CLUSTERED 
(
	[like_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__CommentL__0C0E95F68241B163] UNIQUE NONCLUSTERED 
(
	[comment_id] ASC,
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[CommentMentions]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CommentMentions](
	[comment_mention_id] [int] IDENTITY(1,1) NOT NULL,
	[comment_id] [int] NOT NULL,
	[mentioned_account_id] [int] NOT NULL,
	[start_position] [int] NOT NULL,
	[length] [int] NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK__CommentM__3F3897208E85E068] PRIMARY KEY CLUSTERED 
(
	[comment_mention_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[CommentReactions]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
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
GO
/****** Object:  Table [dbo].[Comments]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Comments](
	[comment_id] [int] IDENTITY(1,1) NOT NULL,
	[post_id] [int] NULL,
	[user_id] [int] NULL,
	[parent_comment_id] [int] NULL,
	[content] [nvarchar](2000) NULL,
	[is_visible] [bit] NULL,
	[created_at] [datetime] NULL,
	[mentioned_user_ids] [nvarchar](500) NULL,
	[hashtags] [nvarchar](500) NULL,
	[likes_count] [int] NOT NULL,
	[replies_count] [int] NOT NULL,
	[updated_at] [datetime] NULL,
	[is_deleted] [bit] NOT NULL,
	[is_edited] [bit] NOT NULL,
 CONSTRAINT [PK__Comments__E7957687412A9BF7] PRIMARY KEY CLUSTERED 
(
	[comment_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ContentModeration]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ContentModeration](
	[ModerationID] [int] IDENTITY(1,1) NOT NULL,
	[ContentType] [nvarchar](20) NOT NULL,
	[ContentID] [int] NOT NULL,
	[account_id] [int] NOT NULL,
	[post_id] [int] NULL,
	[comment_id] [int] NULL,
	[AIConfidence] [float] NOT NULL,
	[ToxicLabel] [nvarchar](50) NOT NULL,
	[Status] [nvarchar](20) NULL,
	[CreatedAt] [datetime] NULL,
 CONSTRAINT [PK__ContentM__7817E6DF3B1457B1] PRIMARY KEY CLUSTERED 
(
	[ModerationID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ContentReports]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ContentReports](
	[report_id] [int] IDENTITY(1,1) NOT NULL,
	[reporter_account_id] [int] NULL,
	[content_type] [nvarchar](20) NOT NULL,
	[content_id] [int] NOT NULL,
	[reason] [nvarchar](500) NULL,
	[status] [nvarchar](20) NOT NULL,
	[assigned_admin_id] [int] NULL,
	[created_at] [datetime] NOT NULL,
	[handled_at] [datetime] NULL,
	[handled_notes] [nvarchar](1000) NULL,
PRIMARY KEY CLUSTERED 
(
	[report_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ConversationMembers]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ConversationMembers](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[conversation_id] [int] NULL,
	[user_id] [int] NULL,
	[role] [nvarchar](20) NULL,
	[joined_at] [datetime] NULL,
	[last_read_message_id] [int] NULL,
	[last_read_at] [datetime] NULL,
 CONSTRAINT [PK__Conversa__3213E83F8F7409EC] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__Conversa__DA859DEB2E20C2DA] UNIQUE NONCLUSTERED 
(
	[conversation_id] ASC,
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Conversations]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Conversations](
	[conversation_id] [int] IDENTITY(1,1) NOT NULL,
	[is_group] [bit] NULL,
	[name] [nvarchar](100) NULL,
	[avatar_url] [nvarchar](255) NULL,
	[created_at] [datetime] NULL,
	[invite_permission] [nvarchar](20) NOT NULL,
	[max_members] [int] NULL,
	[created_by] [int] NULL,
 CONSTRAINT [PK__Conversa__311E7E9A8B5F6B02] PRIMARY KEY CLUSTERED 
(
	[conversation_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ConversationsNew]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ConversationsNew](
	[conversation_id] [int] IDENTITY(1,1) NOT NULL,
	[user1_id] [int] NOT NULL,
	[user2_id] [int] NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
	[updated_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_ConversationsNew] PRIMARY KEY CLUSTERED 
(
	[conversation_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Follows]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Follows](
	[follow_id] [int] IDENTITY(1,1) NOT NULL,
	[follower_id] [int] NULL,
	[following_id] [int] NULL,
	[status] [nvarchar](20) NULL,
	[created_at] [datetime] NULL,
 CONSTRAINT [PK__Follows__15A691441427D89B] PRIMARY KEY CLUSTERED 
(
	[follow_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__Follows__CAC186A6E593AC19] UNIQUE NONCLUSTERED 
(
	[follower_id] ASC,
	[following_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[GroupMessageReactions]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[GroupMessageReactions](
	[message_id] [int] NOT NULL,
	[user_id] [int] NOT NULL,
	[reaction_type] [nvarchar](20) NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_GroupMessageReactions] PRIMARY KEY CLUSTERED 
(
	[message_id] ASC,
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[GroupMessageReads]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[GroupMessageReads](
	[message_id] [int] NOT NULL,
	[user_id] [int] NOT NULL,
	[read_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_GroupMessageReads] PRIMARY KEY CLUSTERED 
(
	[message_id] ASC,
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Hashtags]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Hashtags](
	[hashtag_id] [int] IDENTITY(1,1) NOT NULL,
	[name] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK__Hashtags__F59C84EC360888C0] PRIMARY KEY CLUSTERED 
(
	[hashtag_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__Hashtags__72E12F1B1404EAED] UNIQUE NONCLUSTERED 
(
	[name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[LoginHistory]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[LoginHistory](
	[history_id] [int] IDENTITY(1,1) NOT NULL,
	[account_id] [int] NULL,
	[ip_address] [nvarchar](50) NULL,
	[device_info] [nvarchar](500) NOT NULL,
	[login_time] [datetime] NULL,
 CONSTRAINT [PK__LoginHis__096AA2E93BAF0784] PRIMARY KEY CLUSTERED 
(
	[history_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MessageRestrictions]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MessageRestrictions](
	[restriction_id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [int] NOT NULL,
	[restricted_by] [int] NULL,
	[reason] [nvarchar](500) NULL,
	[restricted_at] [datetime] NULL,
	[expires_at] [datetime] NULL,
	[is_active] [bit] NULL,
	[restricting_user_id] [int] NOT NULL,
	[restricted_user_id] [int] NOT NULL,
 CONSTRAINT [PK__MessageRestrictions__restriction_id] PRIMARY KEY CLUSTERED 
(
	[restriction_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_MessageRestrictions_Users] UNIQUE NONCLUSTERED 
(
	[restricting_user_id] ASC,
	[restricted_user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Messages]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Messages](
	[message_id] [int] IDENTITY(1,1) NOT NULL,
	[conversation_id] [int] NULL,
	[sender_id] [int] NULL,
	[content] [nvarchar](max) NULL,
	[media_url] [nvarchar](255) NULL,
	[message_type] [nvarchar](20) NULL,
	[status] [nvarchar](20) NULL,
	[reply_to] [int] NULL,
	[created_at] [datetime] NULL,
	[reply_to_message_id] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[updated_at] [datetime2](7) NOT NULL,
	[read_by] [nvarchar](max) NULL,
	[reactions] [nvarchar](max) NULL,
	[file_url] [nvarchar](500) NULL,
	[is_pinned] [bit] NOT NULL,
	[pinned_at] [datetime2](7) NULL,
	[pinned_by] [int] NULL,
 CONSTRAINT [PK__Messages__0BBF6EE62A1C7CC5] PRIMARY KEY CLUSTERED 
(
	[message_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MessagesNew]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MessagesNew](
	[message_id] [int] IDENTITY(1,1) NOT NULL,
	[conversation_id] [int] NOT NULL,
	[sender_id] [int] NOT NULL,
	[content] [nvarchar](max) NULL,
	[message_type] [nvarchar](20) NOT NULL,
	[status] [nvarchar](20) NOT NULL,
	[media_url] [nvarchar](500) NULL,
	[is_deleted] [bit] NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
	[read_at] [datetime2](7) NULL,
	[thumbnail_url] [nvarchar](500) NULL,
	[updated_at] [datetime] NULL,
	[is_recalled] [bit] NOT NULL,
 CONSTRAINT [PK_MessagesNew] PRIMARY KEY CLUSTERED 
(
	[message_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ModerationLogs]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ModerationLogs](
	[LogID] [int] IDENTITY(1,1) NOT NULL,
	[ModerationID] [int] NOT NULL,
	[ActionTaken] [nvarchar](50) NOT NULL,
	[AdminID] [int] NULL,
	[ActionAt] [datetime] NULL,
	[Note] [nvarchar](255) NULL,
 CONSTRAINT [PK__Moderati__5E5499A8C99D1D5D] PRIMARY KEY CLUSTERED 
(
	[LogID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Notifications]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Notifications](
	[notification_id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [int] NULL,
	[sender_id] [int] NULL,
	[type] [int] NOT NULL,
	[content] [nvarchar](500) NOT NULL,
	[is_read] [bit] NULL,
	[created_at] [datetime] NULL,
	[post_id] [int] NULL,
	[comment_id] [int] NULL,
	[reaction_type] [int] NULL,
	[conversation_id] [int] NULL,
	[message_id] [int] NULL,
 CONSTRAINT [PK__Notifica__E059842F6C7611A6] PRIMARY KEY CLUSTERED 
(
	[notification_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[OTPs]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[OTPs](
	[otp_id] [int] IDENTITY(1,1) NOT NULL,
	[account_id] [int] NOT NULL,
	[otp_hash] [nvarchar](255) NOT NULL,
	[purpose] [nvarchar](50) NOT NULL,
	[expires_at] [datetime] NOT NULL,
	[used] [bit] NULL,
	[created_at] [datetime] NULL,
 CONSTRAINT [PK__OTPs__AEE35435523AA240] PRIMARY KEY CLUSTERED 
(
	[otp_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PostHashtags]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PostHashtags](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[post_id] [int] NULL,
	[hashtag_id] [int] NULL,
 CONSTRAINT [PK__PostHash__3213E83F052DAB8C] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__PostHash__E18E4F290447CC33] UNIQUE NONCLUSTERED 
(
	[post_id] ASC,
	[hashtag_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PostLikes]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PostLikes](
	[like_id] [int] IDENTITY(1,1) NOT NULL,
	[post_id] [int] NULL,
	[user_id] [int] NULL,
	[created_at] [datetime] NULL,
 CONSTRAINT [PK__PostLike__992C7930BA26521C] PRIMARY KEY CLUSTERED 
(
	[like_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__PostLike__D54C64174C7D1B5D] UNIQUE NONCLUSTERED 
(
	[post_id] ASC,
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PostMedia]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PostMedia](
	[media_id] [int] IDENTITY(1,1) NOT NULL,
	[post_id] [int] NOT NULL,
	[media_url] [nvarchar](500) NOT NULL,
	[media_type] [nvarchar](20) NOT NULL,
	[media_order] [int] NULL,
	[duration] [int] NULL,
	[created_at] [datetime] NULL,
 CONSTRAINT [PK__PostMedi__D0A840F492B9C7FF] PRIMARY KEY CLUSTERED 
(
	[media_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Posts]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Posts](
	[post_id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [int] NULL,
	[caption] [nvarchar](500) NULL,
	[location] [nvarchar](255) NULL,
	[privacy] [nvarchar](20) NULL,
	[is_visible] [bit] NULL,
	[created_at] [datetime] NULL,
	[CommentsCount] [int] NOT NULL,
	[mentioned_user_ids] [nvarchar](2000) NULL,
	[tagged_user_ids] [nvarchar](2000) NULL,
 CONSTRAINT [PK__Posts__3ED7876628608534] PRIMARY KEY CLUSTERED 
(
	[post_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Reactions]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Reactions](
	[reaction_id] [int] IDENTITY(1,1) NOT NULL,
	[post_id] [int] NOT NULL,
	[user_id] [int] NOT NULL,
	[reaction_type] [int] NOT NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
 CONSTRAINT [PK__Reaction__36A9D2981270314B] PRIMARY KEY CLUSTERED 
(
	[reaction_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Reactions_PostUser] UNIQUE NONCLUSTERED 
(
	[post_id] ASC,
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[RefreshTokens]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RefreshTokens](
	[token_id] [int] IDENTITY(1,1) NOT NULL,
	[account_id] [int] NULL,
	[refresh_token] [nvarchar](1000) NOT NULL,
	[expires_at] [datetime] NOT NULL,
	[created_at] [datetime] NULL,
 CONSTRAINT [PK__RefreshT__CB3C9E17FD9E6E6D] PRIMARY KEY CLUSTERED 
(
	[token_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SearchHistory]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SearchHistory](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [int] NULL,
	[keyword] [nvarchar](100) NULL,
	[searched_at] [datetime] NULL,
 CONSTRAINT [PK__SearchHi__3213E83FD184A657] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Shares]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Shares](
	[share_id] [int] IDENTITY(1,1) NOT NULL,
	[post_id] [int] NOT NULL,
	[user_id] [int] NOT NULL,
	[caption] [nvarchar](500) NULL,
	[privacy] [nvarchar](20) NULL,
	[created_at] [datetime] NULL,
 CONSTRAINT [PK__Shares__C36E8AE55323D0A6] PRIMARY KEY CLUSTERED 
(
	[share_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Stories]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Stories](
	[story_id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [int] NULL,
	[media_url] [nvarchar](255) NOT NULL,
	[privacy] [nvarchar](20) NULL,
	[created_at] [datetime] NULL,
	[expires_at] [datetime] NULL,
	[media_type] [nvarchar](20) NULL,
 CONSTRAINT [PK__Stories__66339C566B916AD6] PRIMARY KEY CLUSTERED 
(
	[story_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StoryViews]    Script Date: 12/10/2025 2:40:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StoryViews](
	[view_id] [int] IDENTITY(1,1) NOT NULL,
	[story_id] [int] NULL,
	[viewer_id] [int] NULL,
	[viewed_at] [datetime] NULL,
 CONSTRAINT [PK__StoryVie__3213E83F99713464] PRIMARY KEY CLUSTERED 
(
	[view_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ__StoryVie__B28D6B88B6A0B5F1] UNIQUE NONCLUSTERED 
(
	[story_id] ASC,
	[viewer_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Index [IX_AccountSanctions_AccountId]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_AccountSanctions_AccountId] ON [dbo].[AccountSanctions]
(
	[account_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_AdminActions_AdminId]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_AdminActions_AdminId] ON [dbo].[AdminActions]
(
	[admin_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Blocks_Blocked]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_Blocks_Blocked] ON [dbo].[Blocks]
(
	[blocked_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Blocks_BlockedId]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_Blocks_BlockedId] ON [dbo].[Blocks]
(
	[blocked_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Blocks_Blocker]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_Blocks_Blocker] ON [dbo].[Blocks]
(
	[blocker_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Blocks_BlockerId]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_Blocks_BlockerId] ON [dbo].[Blocks]
(
	[blocker_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Blocks_CreatedAt]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_Blocks_CreatedAt] ON [dbo].[Blocks]
(
	[created_at] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_Blocks_Blocker_Blocked]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [UQ_Blocks_Blocker_Blocked] ON [dbo].[Blocks]
(
	[blocker_id] ASC,
	[blocked_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_BusinessPayments_AccountId]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_BusinessPayments_AccountId] ON [dbo].[BusinessPayments]
(
	[account_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_BusinessPayments_ExpiresAt]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_BusinessPayments_ExpiresAt] ON [dbo].[BusinessPayments]
(
	[expires_at] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_BusinessPayments_Status]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_BusinessPayments_Status] ON [dbo].[BusinessPayments]
(
	[status] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_BusinessRequests_Status]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_BusinessRequests_Status] ON [dbo].[BusinessVerificationRequests]
(
	[status] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_ContentReports_Status]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_ContentReports_Status] ON [dbo].[ContentReports]
(
	[status] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ConversationMembers_LastReadMessageId]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_ConversationMembers_LastReadMessageId] ON [dbo].[ConversationMembers]
(
	[last_read_message_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_GroupMessageReactions_MessageId]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_GroupMessageReactions_MessageId] ON [dbo].[GroupMessageReactions]
(
	[message_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_GroupMessageReactions_UserId]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_GroupMessageReactions_UserId] ON [dbo].[GroupMessageReactions]
(
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_GroupMessageReads_MessageId]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_GroupMessageReads_MessageId] ON [dbo].[GroupMessageReads]
(
	[message_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_GroupMessageReads_UserId]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_GroupMessageReads_UserId] ON [dbo].[GroupMessageReads]
(
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_MessageRestrictions_RestrictedUserId]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_MessageRestrictions_RestrictedUserId] ON [dbo].[MessageRestrictions]
(
	[restricted_user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_MessageRestrictions_RestrictingUserId]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_MessageRestrictions_RestrictingUserId] ON [dbo].[MessageRestrictions]
(
	[restricting_user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Messages_ConversationId_CreatedAt]    Script Date: 12/10/2025 2:40:45 PM ******/
CREATE NONCLUSTERED INDEX [IX_Messages_ConversationId_CreatedAt] ON [dbo].[Messages]
(
	[conversation_id] ASC,
	[created_at] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Accounts] ADD  CONSTRAINT [DF__Accounts__status__3A81B327]  DEFAULT ('active') FOR [status]
GO
ALTER TABLE [dbo].[Accounts] ADD  CONSTRAINT [DF__Accounts__create__3B75D760]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[Accounts] ADD  CONSTRAINT [DF__Accounts__update__3C69FB99]  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[AccountSanctions] ADD  DEFAULT (getdate()) FOR [start_at]
GO
ALTER TABLE [dbo].[AccountSanctions] ADD  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[AdminActions] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[Admins] ADD  CONSTRAINT [DF__Admins__is_priva__46E78A0C]  DEFAULT ((0)) FOR [is_private]
GO
ALTER TABLE [dbo].[Admins] ADD  CONSTRAINT [DF__Admins__admin_le__47DBAE45]  DEFAULT ('moderator') FOR [admin_level]
GO
ALTER TABLE [dbo].[Blocks] ADD  CONSTRAINT [DF_Blocks_created_at]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[BusinessPayments] ADD  DEFAULT (N'MoMo') FOR [payment_method]
GO
ALTER TABLE [dbo].[BusinessPayments] ADD  DEFAULT (N'Pending') FOR [status]
GO
ALTER TABLE [dbo].[BusinessPayments] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[BusinessVerificationRequests] ADD  DEFAULT (getdate()) FOR [submitted_at]
GO
ALTER TABLE [dbo].[BusinessVerificationRequests] ADD  DEFAULT ('Pending') FOR [status]
GO
ALTER TABLE [dbo].[CloseFriends] ADD  CONSTRAINT [DF__CloseFrie__creat__7F2BE32F]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[CommentEditHistories] ADD  CONSTRAINT [DF__CommentEd__Edite__1B9317B3]  DEFAULT (getutcdate()) FOR [EditedAt]
GO
ALTER TABLE [dbo].[CommentLikes] ADD  CONSTRAINT [DF__CommentLi__creat__72C60C4A]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[CommentMentions] ADD  CONSTRAINT [DF__CommentMe__start__67DE6983]  DEFAULT ((0)) FOR [start_position]
GO
ALTER TABLE [dbo].[CommentMentions] ADD  CONSTRAINT [DF__CommentMe__lengt__68D28DBC]  DEFAULT ((0)) FOR [length]
GO
ALTER TABLE [dbo].[CommentMentions] ADD  CONSTRAINT [DF__CommentMe__creat__69C6B1F5]  DEFAULT (getutcdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[CommentReactions] ADD  CONSTRAINT [DF__CommentRe__react__6E8B6712]  DEFAULT ('Like') FOR [reaction_type]
GO
ALTER TABLE [dbo].[CommentReactions] ADD  CONSTRAINT [DF__CommentRe__creat__6F7F8B4B]  DEFAULT (getutcdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[Comments] ADD  CONSTRAINT [DF__Comments__is_vis__6B24EA82]  DEFAULT ((1)) FOR [is_visible]
GO
ALTER TABLE [dbo].[Comments] ADD  CONSTRAINT [DF__Comments__create__6C190EBB]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[Comments] ADD  CONSTRAINT [DF__Comments__likes___6442E2C9]  DEFAULT ((0)) FOR [likes_count]
GO
ALTER TABLE [dbo].[Comments] ADD  CONSTRAINT [DF__Comments__replie__65370702]  DEFAULT ((0)) FOR [replies_count]
GO
ALTER TABLE [dbo].[Comments] ADD  CONSTRAINT [DF__Comments__is_del__662B2B3B]  DEFAULT ((0)) FOR [is_deleted]
GO
ALTER TABLE [dbo].[Comments] ADD  CONSTRAINT [DF__Comments__is_edi__725BF7F6]  DEFAULT ((0)) FOR [is_edited]
GO
ALTER TABLE [dbo].[ContentModeration] ADD  CONSTRAINT [DF__ContentMo__Statu__31B762FC]  DEFAULT ('Pending') FOR [Status]
GO
ALTER TABLE [dbo].[ContentModeration] ADD  CONSTRAINT [DF__ContentMo__Creat__32AB8735]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[ContentReports] ADD  DEFAULT ('Pending') FOR [status]
GO
ALTER TABLE [dbo].[ContentReports] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[ConversationMembers] ADD  CONSTRAINT [DF__Conversati__role__1332DBDC]  DEFAULT ('member') FOR [role]
GO
ALTER TABLE [dbo].[ConversationMembers] ADD  CONSTRAINT [DF__Conversat__joine__14270015]  DEFAULT (getdate()) FOR [joined_at]
GO
ALTER TABLE [dbo].[Conversations] ADD  CONSTRAINT [DF__Conversat__is_gr__0C85DE4D]  DEFAULT ((0)) FOR [is_group]
GO
ALTER TABLE [dbo].[Conversations] ADD  CONSTRAINT [DF__Conversat__creat__0D7A0286]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[Conversations] ADD  DEFAULT ('all') FOR [invite_permission]
GO
ALTER TABLE [dbo].[ConversationsNew] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[ConversationsNew] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[Follows] ADD  CONSTRAINT [DF__Follows__status__787EE5A0]  DEFAULT ('pending') FOR [status]
GO
ALTER TABLE [dbo].[Follows] ADD  CONSTRAINT [DF__Follows__created__797309D9]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[GroupMessageReactions] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[GroupMessageReads] ADD  DEFAULT (getdate()) FOR [read_at]
GO
ALTER TABLE [dbo].[LoginHistory] ADD  CONSTRAINT [DF__LoginHist__login__5535A963]  DEFAULT (getdate()) FOR [login_time]
GO
ALTER TABLE [dbo].[MessageRestrictions] ADD  DEFAULT (getdate()) FOR [restricted_at]
GO
ALTER TABLE [dbo].[MessageRestrictions] ADD  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[Messages] ADD  CONSTRAINT [DF__Messages__messag__18EBB532]  DEFAULT ('text') FOR [message_type]
GO
ALTER TABLE [dbo].[Messages] ADD  CONSTRAINT [DF__Messages__status__19DFD96B]  DEFAULT ('sent') FOR [status]
GO
ALTER TABLE [dbo].[Messages] ADD  CONSTRAINT [DF__Messages__create__1AD3FDA4]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[Messages] ADD  DEFAULT ((0)) FOR [is_deleted]
GO
ALTER TABLE [dbo].[Messages] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[Messages] ADD  CONSTRAINT [DF_Messages_is_pinned]  DEFAULT ((0)) FOR [is_pinned]
GO
ALTER TABLE [dbo].[MessagesNew] ADD  DEFAULT (N'Text') FOR [message_type]
GO
ALTER TABLE [dbo].[MessagesNew] ADD  DEFAULT (N'Sent') FOR [status]
GO
ALTER TABLE [dbo].[MessagesNew] ADD  DEFAULT ((0)) FOR [is_deleted]
GO
ALTER TABLE [dbo].[MessagesNew] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[MessagesNew] ADD  DEFAULT ((0)) FOR [is_recalled]
GO
ALTER TABLE [dbo].[ModerationLogs] ADD  CONSTRAINT [DF__Moderatio__Actio__37703C52]  DEFAULT (getdate()) FOR [ActionAt]
GO
ALTER TABLE [dbo].[Notifications] ADD  CONSTRAINT [DF__Notificat__is_re__2BFE89A6]  DEFAULT ((0)) FOR [is_read]
GO
ALTER TABLE [dbo].[Notifications] ADD  CONSTRAINT [DF__Notificat__creat__2CF2ADDF]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[OTPs] ADD  CONSTRAINT [DF__OTPs__used__4CA06362]  DEFAULT ((0)) FOR [used]
GO
ALTER TABLE [dbo].[OTPs] ADD  CONSTRAINT [DF__OTPs__created_at__4D94879B]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[PostLikes] ADD  CONSTRAINT [DF__PostLikes__creat__66603565]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[PostMedia] ADD  CONSTRAINT [DF__PostMedia__media__5FB337D6]  DEFAULT ((0)) FOR [media_order]
GO
ALTER TABLE [dbo].[PostMedia] ADD  CONSTRAINT [DF__PostMedia__creat__60A75C0F]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[Posts] ADD  CONSTRAINT [DF__Posts__privacy__59063A47]  DEFAULT ('public') FOR [privacy]
GO
ALTER TABLE [dbo].[Posts] ADD  CONSTRAINT [DF__Posts__is_visibl__59FA5E80]  DEFAULT ((1)) FOR [is_visible]
GO
ALTER TABLE [dbo].[Posts] ADD  CONSTRAINT [DF__Posts__created_a__5AEE82B9]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[Posts] ADD  CONSTRAINT [DF__Posts__CommentsC__671F4F74]  DEFAULT ((0)) FOR [CommentsCount]
GO
ALTER TABLE [dbo].[Reactions] ADD  CONSTRAINT [DF__Reactions__creat__44952D46]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[Reactions] ADD  CONSTRAINT [DF__Reactions__updat__4589517F]  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[RefreshTokens] ADD  CONSTRAINT [DF__RefreshTo__creat__5165187F]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[SearchHistory] ADD  CONSTRAINT [DF__SearchHis__searc__2739D489]  DEFAULT (getdate()) FOR [searched_at]
GO
ALTER TABLE [dbo].[Shares] ADD  CONSTRAINT [DF__Shares__privacy__4A4E069C]  DEFAULT ('public') FOR [privacy]
GO
ALTER TABLE [dbo].[Shares] ADD  CONSTRAINT [DF__Shares__created___4B422AD5]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[Stories] ADD  CONSTRAINT [DF__Stories__privacy__02FC7413]  DEFAULT ('public') FOR [privacy]
GO
ALTER TABLE [dbo].[Stories] ADD  CONSTRAINT [DF__Stories__created__03F0984C]  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[StoryViews] ADD  CONSTRAINT [DF__StoryView__viewe__09A971A2]  DEFAULT (getdate()) FOR [viewed_at]
GO
ALTER TABLE [dbo].[Users] ADD  CONSTRAINT [DF__Users__is_privat__4222D4EF]  DEFAULT ((0)) FOR [is_private]
GO
ALTER TABLE [dbo].[AccountSanctions]  WITH CHECK ADD  CONSTRAINT [FK_AccountSanctions_Accounts] FOREIGN KEY([account_id])
REFERENCES [dbo].[Accounts] ([account_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[AccountSanctions] CHECK CONSTRAINT [FK_AccountSanctions_Accounts]
GO
ALTER TABLE [dbo].[AdminActions]  WITH CHECK ADD  CONSTRAINT [FK_AdminActions_Admins] FOREIGN KEY([admin_id])
REFERENCES [dbo].[Admins] ([admin_id])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[AdminActions] CHECK CONSTRAINT [FK_AdminActions_Admins]
GO
ALTER TABLE [dbo].[Admins]  WITH CHECK ADD  CONSTRAINT [FK__Admins__account___44FF419A] FOREIGN KEY([account_id])
REFERENCES [dbo].[Accounts] ([account_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Admins] CHECK CONSTRAINT [FK__Admins__account___44FF419A]
GO
ALTER TABLE [dbo].[Blocks]  WITH CHECK ADD  CONSTRAINT [FK_Blocks_Blocker_Users] FOREIGN KEY([blocker_id])
REFERENCES [dbo].[Users] ([user_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Blocks] CHECK CONSTRAINT [FK_Blocks_Blocker_Users]
GO
ALTER TABLE [dbo].[BusinessPayments]  WITH CHECK ADD  CONSTRAINT [FK_BusinessPayments_Accounts] FOREIGN KEY([account_id])
REFERENCES [dbo].[Accounts] ([account_id])
GO
ALTER TABLE [dbo].[BusinessPayments] CHECK CONSTRAINT [FK_BusinessPayments_Accounts]
GO
ALTER TABLE [dbo].[BusinessPayments]  WITH CHECK ADD  CONSTRAINT [FK_BusinessPayments_Requests] FOREIGN KEY([request_id])
REFERENCES [dbo].[BusinessVerificationRequests] ([request_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[BusinessPayments] CHECK CONSTRAINT [FK_BusinessPayments_Requests]
GO
ALTER TABLE [dbo].[BusinessVerificationRequests]  WITH CHECK ADD  CONSTRAINT [FK_BusinessVerificationRequests_Accounts] FOREIGN KEY([account_id])
REFERENCES [dbo].[Accounts] ([account_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[BusinessVerificationRequests] CHECK CONSTRAINT [FK_BusinessVerificationRequests_Accounts]
GO
ALTER TABLE [dbo].[CloseFriends]  WITH CHECK ADD  CONSTRAINT [FK__CloseFrie__frien__7E37BEF6] FOREIGN KEY([friend_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[CloseFriends] CHECK CONSTRAINT [FK__CloseFrie__frien__7E37BEF6]
GO
ALTER TABLE [dbo].[CloseFriends]  WITH CHECK ADD  CONSTRAINT [FK__CloseFrie__user___7D439ABD] FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[CloseFriends] CHECK CONSTRAINT [FK__CloseFrie__user___7D439ABD]
GO
ALTER TABLE [dbo].[CommentEditHistories]  WITH CHECK ADD  CONSTRAINT [FK_CommentEditHistories_Comments_CommentId] FOREIGN KEY([CommentId])
REFERENCES [dbo].[Comments] ([comment_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[CommentEditHistories] CHECK CONSTRAINT [FK_CommentEditHistories_Comments_CommentId]
GO
ALTER TABLE [dbo].[CommentLikes]  WITH CHECK ADD  CONSTRAINT [FK__CommentLi__comme__70DDC3D8] FOREIGN KEY([comment_id])
REFERENCES [dbo].[Comments] ([comment_id])
GO
ALTER TABLE [dbo].[CommentLikes] CHECK CONSTRAINT [FK__CommentLi__comme__70DDC3D8]
GO
ALTER TABLE [dbo].[CommentLikes]  WITH CHECK ADD  CONSTRAINT [FK__CommentLi__user___71D1E811] FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[CommentLikes] CHECK CONSTRAINT [FK__CommentLi__user___71D1E811]
GO
ALTER TABLE [dbo].[CommentMentions]  WITH CHECK ADD  CONSTRAINT [FK_CommentMentions_Accounts] FOREIGN KEY([mentioned_account_id])
REFERENCES [dbo].[Accounts] ([account_id])
GO
ALTER TABLE [dbo].[CommentMentions] CHECK CONSTRAINT [FK_CommentMentions_Accounts]
GO
ALTER TABLE [dbo].[CommentMentions]  WITH CHECK ADD  CONSTRAINT [FK_CommentMentions_Comments] FOREIGN KEY([comment_id])
REFERENCES [dbo].[Comments] ([comment_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[CommentMentions] CHECK CONSTRAINT [FK_CommentMentions_Comments]
GO
ALTER TABLE [dbo].[CommentReactions]  WITH CHECK ADD  CONSTRAINT [FK_CommentReactions_Accounts] FOREIGN KEY([account_id])
REFERENCES [dbo].[Accounts] ([account_id])
GO
ALTER TABLE [dbo].[CommentReactions] CHECK CONSTRAINT [FK_CommentReactions_Accounts]
GO
ALTER TABLE [dbo].[CommentReactions]  WITH CHECK ADD  CONSTRAINT [FK_CommentReactions_Comments] FOREIGN KEY([comment_id])
REFERENCES [dbo].[Comments] ([comment_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[CommentReactions] CHECK CONSTRAINT [FK_CommentReactions_Comments]
GO
ALTER TABLE [dbo].[Comments]  WITH CHECK ADD  CONSTRAINT [FK__Comments__parent__6D0D32F4] FOREIGN KEY([parent_comment_id])
REFERENCES [dbo].[Comments] ([comment_id])
GO
ALTER TABLE [dbo].[Comments] CHECK CONSTRAINT [FK__Comments__parent__6D0D32F4]
GO
ALTER TABLE [dbo].[Comments]  WITH CHECK ADD  CONSTRAINT [FK__Comments__post_i__693CA210] FOREIGN KEY([post_id])
REFERENCES [dbo].[Posts] ([post_id])
GO
ALTER TABLE [dbo].[Comments] CHECK CONSTRAINT [FK__Comments__post_i__693CA210]
GO
ALTER TABLE [dbo].[Comments]  WITH CHECK ADD  CONSTRAINT [FK__Comments__user_i__6A30C649] FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[Comments] CHECK CONSTRAINT [FK__Comments__user_i__6A30C649]
GO
ALTER TABLE [dbo].[ContentModeration]  WITH CHECK ADD  CONSTRAINT [FK__ContentMo__accou__339FAB6E] FOREIGN KEY([account_id])
REFERENCES [dbo].[Accounts] ([account_id])
GO
ALTER TABLE [dbo].[ContentModeration] CHECK CONSTRAINT [FK__ContentMo__accou__339FAB6E]
GO
ALTER TABLE [dbo].[ContentModeration]  WITH CHECK ADD  CONSTRAINT [FK__ContentMo__comme__30C33EC3] FOREIGN KEY([comment_id])
REFERENCES [dbo].[Comments] ([comment_id])
GO
ALTER TABLE [dbo].[ContentModeration] CHECK CONSTRAINT [FK__ContentMo__comme__30C33EC3]
GO
ALTER TABLE [dbo].[ContentModeration]  WITH CHECK ADD  CONSTRAINT [FK__ContentMo__post___2FCF1A8A] FOREIGN KEY([post_id])
REFERENCES [dbo].[Posts] ([post_id])
GO
ALTER TABLE [dbo].[ContentModeration] CHECK CONSTRAINT [FK__ContentMo__post___2FCF1A8A]
GO
ALTER TABLE [dbo].[ContentReports]  WITH CHECK ADD  CONSTRAINT [FK_ContentReports_Reporter] FOREIGN KEY([reporter_account_id])
REFERENCES [dbo].[Accounts] ([account_id])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[ContentReports] CHECK CONSTRAINT [FK_ContentReports_Reporter]
GO
ALTER TABLE [dbo].[ConversationMembers]  WITH CHECK ADD  CONSTRAINT [FK__Conversat__conve__114A936A] FOREIGN KEY([conversation_id])
REFERENCES [dbo].[Conversations] ([conversation_id])
GO
ALTER TABLE [dbo].[ConversationMembers] CHECK CONSTRAINT [FK__Conversat__conve__114A936A]
GO
ALTER TABLE [dbo].[ConversationMembers]  WITH CHECK ADD  CONSTRAINT [FK__Conversat__user___123EB7A3] FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[ConversationMembers] CHECK CONSTRAINT [FK__Conversat__user___123EB7A3]
GO
ALTER TABLE [dbo].[ConversationMembers]  WITH CHECK ADD  CONSTRAINT [FK_ConversationMembers_Messages_LastReadMessageId] FOREIGN KEY([last_read_message_id])
REFERENCES [dbo].[Messages] ([message_id])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[ConversationMembers] CHECK CONSTRAINT [FK_ConversationMembers_Messages_LastReadMessageId]
GO
ALTER TABLE [dbo].[ConversationsNew]  WITH CHECK ADD  CONSTRAINT [FK_ConversationsNew_Users_user1_id] FOREIGN KEY([user1_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[ConversationsNew] CHECK CONSTRAINT [FK_ConversationsNew_Users_user1_id]
GO
ALTER TABLE [dbo].[ConversationsNew]  WITH CHECK ADD  CONSTRAINT [FK_ConversationsNew_Users_user2_id] FOREIGN KEY([user2_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[ConversationsNew] CHECK CONSTRAINT [FK_ConversationsNew_Users_user2_id]
GO
ALTER TABLE [dbo].[Follows]  WITH CHECK ADD  CONSTRAINT [FK__Follows__followe__76969D2E] FOREIGN KEY([follower_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[Follows] CHECK CONSTRAINT [FK__Follows__followe__76969D2E]
GO
ALTER TABLE [dbo].[Follows]  WITH CHECK ADD  CONSTRAINT [FK__Follows__followi__778AC167] FOREIGN KEY([following_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[Follows] CHECK CONSTRAINT [FK__Follows__followi__778AC167]
GO
ALTER TABLE [dbo].[LoginHistory]  WITH CHECK ADD  CONSTRAINT [FK__LoginHist__accou__5441852A] FOREIGN KEY([account_id])
REFERENCES [dbo].[Accounts] ([account_id])
GO
ALTER TABLE [dbo].[LoginHistory] CHECK CONSTRAINT [FK__LoginHist__accou__5441852A]
GO
ALTER TABLE [dbo].[MessageRestrictions]  WITH CHECK ADD  CONSTRAINT [FK__MessageRestrictions__restricted_by] FOREIGN KEY([restricted_by])
REFERENCES [dbo].[Admins] ([admin_id])
GO
ALTER TABLE [dbo].[MessageRestrictions] CHECK CONSTRAINT [FK__MessageRestrictions__restricted_by]
GO
ALTER TABLE [dbo].[MessageRestrictions]  WITH CHECK ADD  CONSTRAINT [FK__MessageRestrictions__user_id] FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[MessageRestrictions] CHECK CONSTRAINT [FK__MessageRestrictions__user_id]
GO
ALTER TABLE [dbo].[MessageRestrictions]  WITH CHECK ADD  CONSTRAINT [FK_MessageRestrictions_Restricted] FOREIGN KEY([restricted_user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[MessageRestrictions] CHECK CONSTRAINT [FK_MessageRestrictions_Restricted]
GO
ALTER TABLE [dbo].[MessageRestrictions]  WITH CHECK ADD  CONSTRAINT [FK_MessageRestrictions_Restricting] FOREIGN KEY([restricting_user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[MessageRestrictions] CHECK CONSTRAINT [FK_MessageRestrictions_Restricting]
GO
ALTER TABLE [dbo].[Messages]  WITH CHECK ADD  CONSTRAINT [FK__Messages__conver__17036CC0] FOREIGN KEY([conversation_id])
REFERENCES [dbo].[Conversations] ([conversation_id])
GO
ALTER TABLE [dbo].[Messages] CHECK CONSTRAINT [FK__Messages__conver__17036CC0]
GO
ALTER TABLE [dbo].[Messages]  WITH CHECK ADD  CONSTRAINT [FK__Messages__reply___1BC821DD] FOREIGN KEY([reply_to])
REFERENCES [dbo].[Messages] ([message_id])
GO
ALTER TABLE [dbo].[Messages] CHECK CONSTRAINT [FK__Messages__reply___1BC821DD]
GO
ALTER TABLE [dbo].[Messages]  WITH CHECK ADD  CONSTRAINT [FK__Messages__sender__17F790F9] FOREIGN KEY([sender_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[Messages] CHECK CONSTRAINT [FK__Messages__sender__17F790F9]
GO
ALTER TABLE [dbo].[Messages]  WITH CHECK ADD  CONSTRAINT [FK_Messages_ReplyTo] FOREIGN KEY([reply_to_message_id])
REFERENCES [dbo].[Messages] ([message_id])
GO
ALTER TABLE [dbo].[Messages] CHECK CONSTRAINT [FK_Messages_ReplyTo]
GO
ALTER TABLE [dbo].[MessagesNew]  WITH CHECK ADD  CONSTRAINT [FK_MessagesNew_ConversationsNew_conversation_id] FOREIGN KEY([conversation_id])
REFERENCES [dbo].[ConversationsNew] ([conversation_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[MessagesNew] CHECK CONSTRAINT [FK_MessagesNew_ConversationsNew_conversation_id]
GO
ALTER TABLE [dbo].[MessagesNew]  WITH CHECK ADD  CONSTRAINT [FK_MessagesNew_Users_sender_id] FOREIGN KEY([sender_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[MessagesNew] CHECK CONSTRAINT [FK_MessagesNew_Users_sender_id]
GO
ALTER TABLE [dbo].[ModerationLogs]  WITH CHECK ADD  CONSTRAINT [FK__Moderatio__Admin__395884C4] FOREIGN KEY([AdminID])
REFERENCES [dbo].[Admins] ([admin_id])
GO
ALTER TABLE [dbo].[ModerationLogs] CHECK CONSTRAINT [FK__Moderatio__Admin__395884C4]
GO
ALTER TABLE [dbo].[ModerationLogs]  WITH CHECK ADD  CONSTRAINT [FK__Moderatio__Moder__3864608B] FOREIGN KEY([ModerationID])
REFERENCES [dbo].[ContentModeration] ([ModerationID])
GO
ALTER TABLE [dbo].[ModerationLogs] CHECK CONSTRAINT [FK__Moderatio__Moder__3864608B]
GO
ALTER TABLE [dbo].[Notifications]  WITH CHECK ADD  CONSTRAINT [FK__Notificat__sende__2B0A656D] FOREIGN KEY([sender_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[Notifications] CHECK CONSTRAINT [FK__Notificat__sende__2B0A656D]
GO
ALTER TABLE [dbo].[Notifications]  WITH CHECK ADD  CONSTRAINT [FK__Notificat__user___2A164134] FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[Notifications] CHECK CONSTRAINT [FK__Notificat__user___2A164134]
GO
ALTER TABLE [dbo].[OTPs]  WITH CHECK ADD  CONSTRAINT [FK__OTPs__account_id__4BAC3F29] FOREIGN KEY([account_id])
REFERENCES [dbo].[Accounts] ([account_id])
GO
ALTER TABLE [dbo].[OTPs] CHECK CONSTRAINT [FK__OTPs__account_id__4BAC3F29]
GO
ALTER TABLE [dbo].[PostHashtags]  WITH CHECK ADD  CONSTRAINT [FK__PostHasht__hasht__236943A5] FOREIGN KEY([hashtag_id])
REFERENCES [dbo].[Hashtags] ([hashtag_id])
GO
ALTER TABLE [dbo].[PostHashtags] CHECK CONSTRAINT [FK__PostHasht__hasht__236943A5]
GO
ALTER TABLE [dbo].[PostHashtags]  WITH CHECK ADD  CONSTRAINT [FK__PostHasht__post___22751F6C] FOREIGN KEY([post_id])
REFERENCES [dbo].[Posts] ([post_id])
GO
ALTER TABLE [dbo].[PostHashtags] CHECK CONSTRAINT [FK__PostHasht__post___22751F6C]
GO
ALTER TABLE [dbo].[PostLikes]  WITH CHECK ADD  CONSTRAINT [FK__PostLikes__post___6477ECF3] FOREIGN KEY([post_id])
REFERENCES [dbo].[Posts] ([post_id])
GO
ALTER TABLE [dbo].[PostLikes] CHECK CONSTRAINT [FK__PostLikes__post___6477ECF3]
GO
ALTER TABLE [dbo].[PostLikes]  WITH CHECK ADD  CONSTRAINT [FK__PostLikes__user___656C112C] FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[PostLikes] CHECK CONSTRAINT [FK__PostLikes__user___656C112C]
GO
ALTER TABLE [dbo].[PostMedia]  WITH CHECK ADD  CONSTRAINT [FK__PostMedia__post___5DCAEF64] FOREIGN KEY([post_id])
REFERENCES [dbo].[Posts] ([post_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[PostMedia] CHECK CONSTRAINT [FK__PostMedia__post___5DCAEF64]
GO
ALTER TABLE [dbo].[Posts]  WITH CHECK ADD  CONSTRAINT [FK__Posts__user_id__5812160E] FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[Posts] CHECK CONSTRAINT [FK__Posts__user_id__5812160E]
GO
ALTER TABLE [dbo].[Reactions]  WITH CHECK ADD  CONSTRAINT [FK__Reactions__post___42ACE4D4] FOREIGN KEY([post_id])
REFERENCES [dbo].[Posts] ([post_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Reactions] CHECK CONSTRAINT [FK__Reactions__post___42ACE4D4]
GO
ALTER TABLE [dbo].[Reactions]  WITH CHECK ADD  CONSTRAINT [FK__Reactions__user___43A1090D] FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Reactions] CHECK CONSTRAINT [FK__Reactions__user___43A1090D]
GO
ALTER TABLE [dbo].[RefreshTokens]  WITH CHECK ADD  CONSTRAINT [FK__RefreshTo__accou__5070F446] FOREIGN KEY([account_id])
REFERENCES [dbo].[Accounts] ([account_id])
GO
ALTER TABLE [dbo].[RefreshTokens] CHECK CONSTRAINT [FK__RefreshTo__accou__5070F446]
GO
ALTER TABLE [dbo].[SearchHistory]  WITH CHECK ADD  CONSTRAINT [FK__SearchHis__user___2645B050] FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[SearchHistory] CHECK CONSTRAINT [FK__SearchHis__user___2645B050]
GO
ALTER TABLE [dbo].[Shares]  WITH CHECK ADD  CONSTRAINT [FK__Shares__post_id__4865BE2A] FOREIGN KEY([post_id])
REFERENCES [dbo].[Posts] ([post_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Shares] CHECK CONSTRAINT [FK__Shares__post_id__4865BE2A]
GO
ALTER TABLE [dbo].[Shares]  WITH CHECK ADD  CONSTRAINT [FK__Shares__user_id__4959E263] FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Shares] CHECK CONSTRAINT [FK__Shares__user_id__4959E263]
GO
ALTER TABLE [dbo].[Stories]  WITH CHECK ADD  CONSTRAINT [FK__Stories__user_id__02084FDA] FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[Stories] CHECK CONSTRAINT [FK__Stories__user_id__02084FDA]
GO
ALTER TABLE [dbo].[StoryViews]  WITH CHECK ADD  CONSTRAINT [FK__StoryView__story__07C12930] FOREIGN KEY([story_id])
REFERENCES [dbo].[Stories] ([story_id])
GO
ALTER TABLE [dbo].[StoryViews] CHECK CONSTRAINT [FK__StoryView__story__07C12930]
GO
ALTER TABLE [dbo].[StoryViews]  WITH CHECK ADD  CONSTRAINT [FK__StoryView__viewe__08B54D69] FOREIGN KEY([viewer_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[StoryViews] CHECK CONSTRAINT [FK__StoryView__viewe__08B54D69]
GO
ALTER TABLE [dbo].[Users]  WITH CHECK ADD  CONSTRAINT [FK__Users__account_i__403A8C7D] FOREIGN KEY([account_id])
REFERENCES [dbo].[Accounts] ([account_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Users] CHECK CONSTRAINT [FK__Users__account_i__403A8C7D]
GO
-- account_type constraint removed in V4 (using RBAC instead)
GO
ALTER TABLE [dbo].[Admins]  WITH CHECK ADD  CONSTRAINT [CK__Admins__gender__45F365D3] CHECK  (([gender]='Khác' OR [gender]='N?' OR [gender]='Nam'))
GO
ALTER TABLE [dbo].[Admins] CHECK CONSTRAINT [CK__Admins__gender__45F365D3]
GO
ALTER TABLE [dbo].[BusinessPayments]  WITH CHECK ADD  CONSTRAINT [CK_BusinessPayments_Amount] CHECK  (([amount]>(0)))
GO
ALTER TABLE [dbo].[BusinessPayments] CHECK CONSTRAINT [CK_BusinessPayments_Amount]
GO
ALTER TABLE [dbo].[BusinessPayments]  WITH CHECK ADD  CONSTRAINT [CK_BusinessPayments_ExpiresAfterCreated] CHECK  (([expires_at]>[created_at]))
GO
ALTER TABLE [dbo].[BusinessPayments] CHECK CONSTRAINT [CK_BusinessPayments_ExpiresAfterCreated]
GO
ALTER TABLE [dbo].[BusinessPayments]  WITH CHECK ADD  CONSTRAINT [CK_BusinessPayments_Status] CHECK  (([status]=N'Failed' OR [status]=N'Expired' OR [status]=N'Completed' OR [status]=N'Pending'))
GO
ALTER TABLE [dbo].[BusinessPayments] CHECK CONSTRAINT [CK_BusinessPayments_Status]
GO
ALTER TABLE [dbo].[ContentModeration]  WITH CHECK ADD  CONSTRAINT [CK_ContentModeration_OneID] CHECK  (([ContentType]='Post' AND [post_id] IS NOT NULL AND [comment_id] IS NULL OR [ContentType]='Comment' AND [comment_id] IS NOT NULL AND [post_id] IS NULL))
GO
ALTER TABLE [dbo].[ContentModeration] CHECK CONSTRAINT [CK_ContentModeration_OneID]
GO
ALTER TABLE [dbo].[PostMedia]  WITH CHECK ADD  CONSTRAINT [CK__PostMedia__media__5EBF139D] CHECK  (([media_type]='Video' OR [media_type]='Image'))
GO
ALTER TABLE [dbo].[PostMedia] CHECK CONSTRAINT [CK__PostMedia__media__5EBF139D]
GO
ALTER TABLE [dbo].[Users]  WITH CHECK ADD  CONSTRAINT [CK__Users__gender__412EB0B6] CHECK  (([gender]='Kh?c' OR [gender]='N?' OR [gender]='Nam'))
GO
ALTER TABLE [dbo].[Users] CHECK CONSTRAINT [CK__Users__gender__412EB0B6]

-- ============================================
-- STORED PROCEDURES REMOVED IN V4
-- Old procedures used account_type column
-- In RBAC system, use application-level services
-- ============================================
GO
