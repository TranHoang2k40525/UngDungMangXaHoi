using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UngDungMangXaHoi.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUsernameColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add username column if it doesn't exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                               WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'username')
                BEGIN
                    ALTER TABLE Users ADD username NVARCHAR(50);
                    
                    -- Update existing records with default username
                    UPDATE Users 
                    SET username = 'user_' + CAST(user_id AS NVARCHAR(10))
                    WHERE username IS NULL;
                    
                    -- Make username NOT NULL
                    ALTER TABLE Users ALTER COLUMN username NVARCHAR(50) NOT NULL;
                    
                    -- Create unique index
                    CREATE UNIQUE INDEX IX_Users_Username ON Users(username);
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove username column
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                          WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'username')
                BEGIN
                    DROP INDEX IF EXISTS IX_Users_Username ON Users;
                    ALTER TABLE Users DROP COLUMN username;
                END
            ");
        }
    }
}
