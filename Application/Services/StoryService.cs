using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.ExternalServices;

namespace UngDungMangXaHoi.Application.Services
{
    public class StoryService
    {
        private readonly IStoryRepository _storyRepository;
        private readonly CloudinaryService _cloudinaryService;
        private readonly IUserRepository _userRepository;

        public StoryService(
            IStoryRepository storyRepository, 
            CloudinaryService cloudinaryService,
            IUserRepository userRepository)
        {
            _storyRepository = storyRepository ?? throw new ArgumentNullException(nameof(storyRepository));
            _cloudinaryService = cloudinaryService ?? throw new ArgumentNullException(nameof(cloudinaryService));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        }

        // Tạo story mới
        public async Task<StoryDto> CreateStoryAsync(CreateStoryDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            if (dto.MediaContent == null || dto.MediaContent.Length == 0)
                throw new ArgumentException("Media content is required");

            if (string.IsNullOrEmpty(dto.FileName))
                throw new ArgumentException("File name is required");

            var user = await _userRepository.GetByIdAsync(dto.UserId);
            if (user == null)
                throw new ArgumentException($"User with ID {dto.UserId} not found");

            // ✅ Fix CS1503: convert byte[] -> Stream
            string mediaUrl;
            try 
            {
                using var ms = new MemoryStream(dto.MediaContent);
                mediaUrl = await _cloudinaryService.UploadMediaAsync(ms, dto.FileName, dto.MediaType);
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to upload media to cloud storage: {ex.Message}", ex);
            }

            var story = new Story
            {
                user_id = dto.UserId,
                media_url = mediaUrl,
                media_type = dto.MediaType?.ToLower() ?? "image",
                privacy = dto.Privacy?.ToLower() ?? "public",
                created_at = DateTime.UtcNow,
                expires_at = DateTime.UtcNow.AddHours(24) // Stories expire after 24h
            };

            var created = await _storyRepository.CreateStoryAsync(story);

            return new StoryDto
            {
                Id = created.story_id,
                UserId = created.user_id,
                UserName = user.username?.Value ?? "",
                UserAvatar = user.avatar_url?.Value ?? "",
                MediaUrl = created.media_url,
                MediaType = created.media_type,
                Privacy = created.privacy,
                CreatedAt = created.created_at,
                ExpiresAt = created.expires_at,
                ViewCount = 0,
                HasUserViewed = false
            };
        }

        // Lấy stories của 1 user
        public async Task<IEnumerable<StoryDto>> GetUserStoriesAsync(int userId)
        {
            var stories = await _storyRepository.GetUserStoriesAsync(userId);
            return stories.Select(s => new StoryDto
            {
                Id = s.story_id,
                UserId = s.user_id,
                UserName = s.User?.username?.Value ?? "",
                UserAvatar = s.User?.avatar_url?.Value ?? "",
                MediaUrl = s.media_url,
                MediaType = s.media_type,
                Privacy = s.privacy,
                CreatedAt = s.created_at,
                ExpiresAt = s.expires_at,
                ViewCount = s.Views?.Count ?? 0,
                HasUserViewed = false
            });
        }

        // Lấy stories feed (của bạn bè hoặc toàn feed)
        public async Task<IEnumerable<StoryDto>> GetFeedStoriesAsync(int viewerId)
        {
            var stories = await _storyRepository.GetFeedStoriesAsync(viewerId);
            return stories.Select(s => new StoryDto
            {
                Id = s.story_id,
                UserId = s.user_id,
                UserName = s.User?.username?.Value ?? "",
                UserAvatar = s.User?.avatar_url?.Value ?? "",
                MediaUrl = s.media_url,
                MediaType = s.media_type,
                Privacy = s.privacy,
                CreatedAt = s.created_at,
                ExpiresAt = s.expires_at,
                ViewCount = s.Views?.Count ?? 0,
                HasUserViewed = s.Views?.Any(v => v.viewer_id == viewerId) ?? false
            });
        }

        // Thêm view khi user xem story
        public async Task ViewStoryAsync(int storyId, int viewerId)
        {
            var view = new StoryView
            {
                story_id = storyId,
                viewer_id = viewerId,
                viewed_at = DateTime.UtcNow
            };
            await _storyRepository.AddStoryViewAsync(view);
        }

        // Xóa stories đã hết hạn
        public async Task<int> DeleteExpiredStoriesAsync()
        {
            var expired = await _storyRepository.GetExpiredStoriesAsync();
            int count = 0;

            foreach (var s in expired)
            {
                try
                {
                    if (!string.IsNullOrEmpty(s.media_url))
                    {
                        // Delete media from Cloudinary
                        await _cloudinaryService.DeleteMediaAsync(s.media_url, s.media_type ?? "video");
                    }

                    var ok = await _storyRepository.DeleteStoryAsync(s.story_id);
                    if (ok) count++;
                }
                catch
                {
                    // Ignore lỗi từng item, tiếp tục xóa item khác
                }
            }

            return count;
        }

        // Xóa 1 story của user
        public async Task<bool> DeleteStoryAsync(int storyId, int userId)
        {
            var story = await _storyRepository.GetStoryByIdAsync(storyId);
            if (story == null || story.user_id != userId)
                return false;

            if (!string.IsNullOrEmpty(story.media_url))
            {
                await _cloudinaryService.DeleteMediaAsync(story.media_url, story.media_type ?? "video");
            }

            return await _storyRepository.DeleteStoryAsync(storyId);
        }
    }
}
