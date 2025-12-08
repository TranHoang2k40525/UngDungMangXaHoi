using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces;

public interface IContentModerationRepository
{
    Task<ContentModeration> CreateAsync(ContentModeration moderation);
    Task<ContentModeration?> GetByContentAsync(string contentType, int contentId);
    Task<List<ContentModeration>> GetByAccountIdAsync(int accountId);
    Task<List<ContentModeration>> GetPendingModerationsAsync();
    Task UpdateStatusAsync(int moderationId, string status);
}
