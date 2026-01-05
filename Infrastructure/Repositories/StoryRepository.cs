using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class StoryRepository : IStoryRepository
    {
        private readonly AppDbContext _context;

        public StoryRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Story> CreateStoryAsync(Story story)
        {
            _context.Stories.Add(story);
            await _context.SaveChangesAsync();
            return story;
        }

        public async Task<Story> GetStoryByIdAsync(int id)
        {
            return await _context.Stories
                .Include(s => s.User)
                .Include(s => s.Views)
                .FirstOrDefaultAsync(s => s.story_id == id);
        }

        public async Task<IEnumerable<Story>> GetUserStoriesAsync(int userId)
        {
            return await _context.Stories
                .Include(s => s.User)
                .Include(s => s.Views)
                .Where(s => s.user_id == userId && s.expires_at > DateTime.UtcNow)
                .OrderByDescending(s => s.created_at)
                .ToListAsync();
        }

        public async Task<IEnumerable<Story>> GetFeedStoriesAsync(int viewerId)
        {
            var twentyFourHoursAgo = DateTime.UtcNow.AddHours(-24);
            
            Console.WriteLine($"[StoryRepo] GetFeedStoriesAsync for viewerId: {viewerId}");
            
            // Lấy danh sách bạn bè đã kết nối (status = 'accepted')
            var friendIds = await _context.Follows
                .Where(f => (f.follower_id == viewerId || f.following_id == viewerId) 
                           && f.status == "accepted")
                .Select(f => f.follower_id == viewerId ? f.following_id : f.follower_id)
                .Distinct()
                .ToListAsync();
            
            Console.WriteLine($"[StoryRepo] Found {friendIds.Count} friends: [{string.Join(", ", friendIds)}]");
            
            // Lấy stories công khai của bạn bè + stories của chính mình
            var stories = await _context.Stories
                .Include(s => s.User)
                .Include(s => s.Views)
                .Where(s => s.created_at > twentyFourHoursAgo 
                           && s.expires_at > DateTime.UtcNow
                           && (s.user_id == viewerId // Stories của chính mình
                               || (friendIds.Contains(s.user_id) && s.privacy == "public"))) // Stories công khai của bạn bè
                .OrderByDescending(s => s.created_at)
                .ToListAsync();
            
            Console.WriteLine($"[StoryRepo] Found {stories.Count} stories total");
            foreach (var s in stories)
            {
                Console.WriteLine($"  - Story {s.story_id}: user_id={s.user_id}, privacy={s.privacy}");
            }
            
            return stories;
        }

        public async Task AddStoryViewAsync(StoryView view)
        {
            // Avoid duplicate view entries (unique constraint on story_id + viewer_id)
            var exists = await _context.StoryViews.AnyAsync(sv => sv.story_id == view.story_id && sv.viewer_id == view.viewer_id);
            if (exists) return;
            _context.StoryViews.Add(view);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Story>> GetExpiredStoriesAsync()
        {
            return await _context.Stories
                .Include(s => s.User)
                .Include(s => s.Views)
                .Where(s => s.expires_at <= DateTime.UtcNow)
                .ToListAsync();
        }

        public async Task<bool> DeleteStoryAsync(int id)
        {
            var story = await _context.Stories
                .FirstOrDefaultAsync(s => s.story_id == id);
            if (story == null) return false;

            _context.Stories.Remove(story);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<StoryView>> GetStoryViewsAsync(int storyId)
        {
            return await _context.StoryViews
                .Include(sv => sv.Viewer)
                .Where(sv => sv.story_id == storyId)
                .OrderByDescending(sv => sv.viewed_at)
                .ToListAsync();
        }
    }
}
