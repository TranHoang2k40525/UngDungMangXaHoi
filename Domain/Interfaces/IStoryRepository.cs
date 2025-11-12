using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IStoryRepository
    {
        Task<Story> CreateStoryAsync(Story story);
        Task<Story> GetStoryByIdAsync(int id);
        Task<IEnumerable<Story>> GetUserStoriesAsync(int userId);
        Task<IEnumerable<Story>> GetFeedStoriesAsync(int viewerId);
        Task AddStoryViewAsync(StoryView view);
        // Returns stories that have expired (expires_at <= now) so callers can cleanup cloud media if needed
        Task<IEnumerable<Story>> GetExpiredStoriesAsync();
        Task<bool> DeleteStoryAsync(int id);
        Task<IEnumerable<StoryView>> GetStoryViewsAsync(int storyId);
    }
}
