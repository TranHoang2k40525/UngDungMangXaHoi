using Microsoft.Data.SqlClient;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Infrastructure.Repositories;

public class ContentModerationRepository : IContentModerationRepository
{
    private readonly string _connectionString;

    public ContentModerationRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<ContentModeration> CreateAsync(ContentModeration moderation)
    {
        var query = @"
            INSERT INTO ContentModeration 
            (ContentType, ContentID, account_id, post_id, comment_id, AIConfidence, ToxicLabel, Status, CreatedAt)
            VALUES 
            (@ContentType, @ContentID, @AccountId, @PostId, @CommentId, @AIConfidence, @ToxicLabel, @Status, @CreatedAt);
            SELECT CAST(SCOPE_IDENTITY() as int);";

        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        using var command = new SqlCommand(query, connection);
        command.Parameters.AddWithValue("@ContentType", moderation.ContentType);
        command.Parameters.AddWithValue("@ContentID", moderation.ContentID);
        command.Parameters.AddWithValue("@AccountId", moderation.AccountId);
        command.Parameters.AddWithValue("@PostId", (object?)moderation.PostId ?? DBNull.Value);
        command.Parameters.AddWithValue("@CommentId", (object?)moderation.CommentId ?? DBNull.Value);
        command.Parameters.AddWithValue("@AIConfidence", moderation.AIConfidence);
        command.Parameters.AddWithValue("@ToxicLabel", moderation.ToxicLabel);
        command.Parameters.AddWithValue("@Status", moderation.Status);
        command.Parameters.AddWithValue("@CreatedAt", moderation.CreatedAt);

        moderation.ModerationID = (int)(await command.ExecuteScalarAsync() ?? 0);
        return moderation;
    }

    public async Task<ContentModeration?> GetByContentAsync(string contentType, int contentId)
    {
        var query = @"
            SELECT TOP 1 * FROM ContentModeration 
            WHERE ContentType = @ContentType AND ContentID = @ContentId
            ORDER BY CreatedAt DESC";

        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        using var command = new SqlCommand(query, connection);
        command.Parameters.AddWithValue("@ContentType", contentType);
        command.Parameters.AddWithValue("@ContentId", contentId);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapToEntity(reader);
        }

        return null;
    }

    public async Task<List<ContentModeration>> GetByAccountIdAsync(int accountId)
    {
        var query = @"
            SELECT * FROM ContentModeration 
            WHERE account_id = @AccountId
            ORDER BY CreatedAt DESC";

        var moderations = new List<ContentModeration>();

        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        using var command = new SqlCommand(query, connection);
        command.Parameters.AddWithValue("@AccountId", accountId);

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            moderations.Add(MapToEntity(reader));
        }

        return moderations;
    }

    public async Task<List<ContentModeration>> GetPendingModerationsAsync()
    {
        var query = @"
            SELECT * FROM ContentModeration 
            WHERE Status = 'pending'
            ORDER BY CreatedAt DESC";

        var moderations = new List<ContentModeration>();

        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        using var command = new SqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();
        
        while (await reader.ReadAsync())
        {
            moderations.Add(MapToEntity(reader));
        }

        return moderations;
    }

    public async Task UpdateStatusAsync(int moderationId, string status)
    {
        var query = @"
            UPDATE ContentModeration 
            SET Status = @Status 
            WHERE ModerationID = @ModerationId";

        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        using var command = new SqlCommand(query, connection);
        command.Parameters.AddWithValue("@Status", status);
        command.Parameters.AddWithValue("@ModerationId", moderationId);

        await command.ExecuteNonQueryAsync();
    }

    private ContentModeration MapToEntity(SqlDataReader reader)
    {
        return new ContentModeration
        {
            ModerationID = reader.GetInt32(reader.GetOrdinal("ModerationID")),
            ContentType = reader.GetString(reader.GetOrdinal("ContentType")),
            ContentID = reader.GetInt32(reader.GetOrdinal("ContentID")),
            AccountId = reader.GetInt32(reader.GetOrdinal("account_id")),
            PostId = reader.IsDBNull(reader.GetOrdinal("post_id")) ? null : reader.GetInt32(reader.GetOrdinal("post_id")),
            CommentId = reader.IsDBNull(reader.GetOrdinal("comment_id")) ? null : reader.GetInt32(reader.GetOrdinal("comment_id")),
            AIConfidence = reader.GetDouble(reader.GetOrdinal("AIConfidence")),
            ToxicLabel = reader.GetString(reader.GetOrdinal("ToxicLabel")),
            Status = reader.GetString(reader.GetOrdinal("Status")),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt"))
        };
    }
}
