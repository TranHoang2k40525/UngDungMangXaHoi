using System;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Services;
using UngDungMangXaHoi.Infrastructure.ExternalServices;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    // DTO cho Swagger và model binding
    public class CreateStoryRequest
    {
        [Required]
        public IFormFile Media { get; set; } = null!;
        
        [Required]
        public string MediaType { get; set; } = "image";
        
        [Required]
        public string Privacy { get; set; } = "public";
        
        public int? UserId { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "UserOnly")]

    public class StoriesController : ControllerBase
    {
        private readonly StoryService _storyService;
        private readonly CloudinaryService _cloudinaryService;

        public StoriesController(StoryService storyService, CloudinaryService cloudinaryService)
        {
            _storyService = storyService;
            _cloudinaryService = cloudinaryService;
        }

        [HttpPost]
        [Authorize]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreateStory([FromForm] CreateStoryRequest request)
        {
            try
            {
                int userId = request.UserId ?? 0;
                if (userId == 0)
                {
                    var claim = User.FindFirst("user_id") ?? User.FindFirst("sub");
                    if (claim != null && int.TryParse(claim.Value, out var cval))
                        userId = cval;
                }

                if (userId == 0)
                    return BadRequest(new { message = "Missing UserId" });

                if (request.Media == null || request.Media.Length == 0)
                    return BadRequest(new { message = "No media file uploaded" });

                byte[] mediaBytes;
                using (var ms = new MemoryStream())
                {
                    await request.Media.CopyToAsync(ms);
                    mediaBytes = ms.ToArray();
                }

                Console.WriteLine($"[CreateStory] Preparing to upload media: {request.Media.FileName}, Size: {mediaBytes.Length} bytes, Type: {request.MediaType}");
                
                string uploadedUrl;
                using (var stream = new MemoryStream(mediaBytes))
                {
                    uploadedUrl = await _cloudinaryService.UploadMediaAsync(stream, request.Media.FileName, request.MediaType ?? "image");
                }

                Console.WriteLine($"[CreateStory] Upload result URL: {uploadedUrl ?? "NULL"}");

                if (string.IsNullOrEmpty(uploadedUrl))
                {
                    Console.WriteLine($"[CreateStory] Upload failed - empty URL returned");
                    return StatusCode(500, new { message = "Failed to upload media to Cloudinary" });
                }

                var dto = new CreateStoryDto
                {
                    MediaContent = mediaBytes,
                    MediaType = request.MediaType ?? "image",
                    Privacy = request.Privacy ?? "public",
                    FileName = request.Media.FileName,
                    UserId = userId
                };

                var createdStory = await _storyService.CreateStoryAsync(dto);

                return Ok(new
                {
                    message = "Story created successfully",
                    data = createdStory
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CreateStory] Exception: {ex.Message}");
                Console.WriteLine($"[CreateStory] StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserStories(int userId)
        {
            try
            {
                var stories = await _storyService.GetUserStoriesAsync(userId);
                return Ok(stories);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("feed")]
        public async Task<IActionResult> GetFeedStories()
        {
            try
            {
                int viewerId = 0;
                var claim = User.FindFirst("user_id") ?? User.FindFirst("sub");
                if (claim != null && int.TryParse(claim.Value, out var cval))
                    viewerId = cval;

                Console.WriteLine($"[GetFeedStories] ViewerId: {viewerId}");
                
                var stories = await _storyService.GetFeedStoriesAsync(viewerId);
                var storiesList = stories.ToList();
                
                Console.WriteLine($"[GetFeedStories] Found {storiesList.Count} user groups with stories");
                foreach (var group in storiesList)
                {
                    Console.WriteLine($"  - User {group.UserId} ({group.UserName}): {group.Stories.Count} stories");
                    foreach (var story in group.Stories)
                    {
                        Console.WriteLine($"    * Story ID: {story.Id}, Privacy: {story.Privacy}, MediaUrl: {story.MediaUrl}");
                    }
                }
                
                return Ok(new { data = storiesList });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetFeedStories] ERROR: {ex.Message}");
                Console.WriteLine($"[GetFeedStories] StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { message = ex.Message, stack = ex.StackTrace });
            }
        }

        [HttpPost("{storyId}/view")]
        public async Task<IActionResult> ViewStory(int storyId)
        {
            try
            {
                int viewerId = 0;
                var claim = User.FindFirst("user_id") ?? User.FindFirst("sub");
                if (claim != null && int.TryParse(claim.Value, out var cval))
                    viewerId = cval;

                if (viewerId == 0)
                    return BadRequest(new { message = "Missing viewer id" });

                await _storyService.ViewStoryAsync(storyId, viewerId);
                return Ok(new { message = "Viewed" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("{storyId}")]
        [Authorize]
        public async Task<IActionResult> DeleteStory(int storyId)
        {
            try
            {
                int userId = 0;
                var claim = User.FindFirst("user_id") ?? User.FindFirst("sub");
                if (claim != null && int.TryParse(claim.Value, out var cval))
                    userId = cval;

                if (userId == 0)
                    return BadRequest(new { message = "Missing user id" });

                var deleted = await _storyService.DeleteStoryAsync(storyId, userId);
                if (!deleted)
                    return NotFound(new { message = "Story not found or not owner" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
