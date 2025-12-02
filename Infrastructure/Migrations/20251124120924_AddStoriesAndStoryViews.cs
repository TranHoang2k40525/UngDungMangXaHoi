using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UngDungMangXaHoi.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStoriesAndStoryViews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "mentioned_user_ids",
                table: "Posts",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tagged_user_ids",
                table: "Posts",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "Follows",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Stories",
                columns: table => new
                {
                    story_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    media_url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    media_type = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    privacy = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    expires_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stories", x => x.story_id);
                    table.ForeignKey(
                        name: "FK_Stories_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StoryViews",
                columns: table => new
                {
                    view_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    story_id = table.Column<int>(type: "int", nullable: false),
                    viewer_id = table.Column<int>(type: "int", nullable: false),
                    viewed_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoryViews", x => x.view_id);
                    table.ForeignKey(
                        name: "FK_StoryViews_Stories_story_id",
                        column: x => x.story_id,
                        principalTable: "Stories",
                        principalColumn: "story_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StoryViews_Users_viewer_id",
                        column: x => x.viewer_id,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "ConversationsNew",
                columns: table => new
                {
                    conversation_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user1_id = table.Column<int>(type: "int", nullable: false),
                    user2_id = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConversationsNew", x => x.conversation_id);
                    table.ForeignKey(
                        name: "FK_ConversationsNew_Users_user1_id",
                        column: x => x.user1_id,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ConversationsNew_Users_user2_id",
                        column: x => x.user2_id,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GroupMessageReactions",
                columns: table => new
                {
                    message_id = table.Column<int>(type: "int", nullable: false),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    reaction_type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupMessageReactions", x => new { x.message_id, x.user_id });
                });

            migrationBuilder.CreateTable(
                name: "GroupMessageReads",
                columns: table => new
                {
                    message_id = table.Column<int>(type: "int", nullable: false),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    read_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupMessageReads", x => new { x.message_id, x.user_id });
                });

            migrationBuilder.CreateTable(
                name: "MessagesNew",
                columns: table => new
                {
                    message_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    conversation_id = table.Column<int>(type: "int", nullable: false),
                    sender_id = table.Column<int>(type: "int", nullable: false),
                    content = table.Column<string>(type: "nvarchar(max)", maxLength: 5000, nullable: false),
                    message_type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    media_url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    thumbnail_url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    is_recalled = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    read_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MessagesNew", x => x.message_id);
                    table.ForeignKey(
                        name: "FK_MessagesNew_ConversationsNew_conversation_id",
                        column: x => x.conversation_id,
                        principalTable: "ConversationsNew",
                        principalColumn: "conversation_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MessagesNew_Users_sender_id",
                        column: x => x.sender_id,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ConversationsNew_user1_id_user2_id",
                table: "ConversationsNew",
                columns: new[] { "user1_id", "user2_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ConversationsNew_user2_id",
                table: "ConversationsNew",
                column: "user2_id");

            migrationBuilder.CreateIndex(
                name: "IX_MessagesNew_conversation_id",
                table: "MessagesNew",
                column: "conversation_id");

            migrationBuilder.CreateIndex(
                name: "IX_MessagesNew_created_at",
                table: "MessagesNew",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_MessagesNew_sender_id",
                table: "MessagesNew",
                column: "sender_id");

            migrationBuilder.CreateIndex(
                name: "IX_Stories_user_id",
                table: "Stories",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_StoryViews_story_id",
                table: "StoryViews",
                column: "story_id");

            migrationBuilder.CreateIndex(
                name: "IX_StoryViews_viewer_id",
                table: "StoryViews",
                column: "viewer_id");

            migrationBuilder.CreateIndex(
                name: "UQ_StoryViews",
                table: "StoryViews",
                columns: new[] { "story_id", "viewer_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StoryViews");

            migrationBuilder.DropTable(
                name: "Stories");

            migrationBuilder.DropTable(
                name: "GroupMessageReactions");

            migrationBuilder.DropTable(
                name: "GroupMessageReads");

            migrationBuilder.DropTable(
                name: "MessagesNew");

            migrationBuilder.DropTable(
                name: "ConversationsNew");

            migrationBuilder.DropColumn(
                name: "mentioned_user_ids",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "tagged_user_ids",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "status",
                table: "Follows");
        }
    }
}
