using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UngDungMangXaHoi.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReactionsSharesNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "Posts",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETDATE()",
                oldClrType: typeof(DateTimeOffset),
                oldType: "datetimeoffset",
                oldDefaultValueSql: "GETDATE()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "PostMedia",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETDATE()",
                oldClrType: typeof(DateTimeOffset),
                oldType: "datetimeoffset",
                oldDefaultValueSql: "GETDATE()");

            migrationBuilder.CreateTable(
                name: "Follows",
                columns: table => new
                {
                    follow_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    follower_id = table.Column<int>(type: "int", nullable: false),
                    following_id = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Follows", x => x.follow_id);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    notification_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    sender_id = table.Column<int>(type: "int", nullable: true),
                    type = table.Column<int>(type: "int", nullable: false),
                    post_id = table.Column<int>(type: "int", nullable: true),
                    content = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    is_read = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.notification_id);
                    table.ForeignKey(
                        name: "FK_Notifications_Posts_post_id",
                        column: x => x.post_id,
                        principalTable: "Posts",
                        principalColumn: "post_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_sender_id",
                        column: x => x.sender_id,
                        principalTable: "Users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "FK_Notifications_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reactions",
                columns: table => new
                {
                    reaction_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    post_id = table.Column<int>(type: "int", nullable: false),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    reaction_type = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reactions", x => x.reaction_id);
                    table.ForeignKey(
                        name: "FK_Reactions_Posts_post_id",
                        column: x => x.post_id,
                        principalTable: "Posts",
                        principalColumn: "post_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Reactions_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "Shares",
                columns: table => new
                {
                    share_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    post_id = table.Column<int>(type: "int", nullable: false),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    caption = table.Column<string>(type: "nvarchar(2200)", maxLength: 2200, nullable: true),
                    privacy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "public"),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shares", x => x.share_id);
                    table.ForeignKey(
                        name: "FK_Shares_Posts_post_id",
                        column: x => x.post_id,
                        principalTable: "Posts",
                        principalColumn: "post_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Shares_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Notification_UserId_IsRead_CreatedAt",
                table: "Notifications",
                columns: new[] { "user_id", "is_read", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_post_id",
                table: "Notifications",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_sender_id",
                table: "Notifications",
                column: "sender_id");

            migrationBuilder.CreateIndex(
                name: "IX_Reactions_user_id",
                table: "Reactions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "UQ_Reaction_Post_User",
                table: "Reactions",
                columns: new[] { "post_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Shares_post_id",
                table: "Shares",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_Shares_user_id",
                table: "Shares",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Follows");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "Reactions");

            migrationBuilder.DropTable(
                name: "Shares");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "created_at",
                table: "Posts",
                type: "datetimeoffset",
                nullable: false,
                defaultValueSql: "GETDATE()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "GETDATE()");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "created_at",
                table: "PostMedia",
                type: "datetimeoffset",
                nullable: false,
                defaultValueSql: "GETDATE()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "GETDATE()");
        }
    }
}
