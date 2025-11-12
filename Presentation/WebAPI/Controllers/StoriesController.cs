using System;
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
    [ApiController]
    [Route("api/[controller]")]
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
        public async Task<IActionResult> CreateStory([FromForm] IFormFile Media, [FromForm] string MediaType, [FromForm] string Privacy, [FromForm] int? UserId)
        {
            try
            {
                int userId = UserId ?? 0;
                if (userId == 0)
                {
                    var claim = User.FindFirst("user_id") ?? User.FindFirst("sub");
                    if (claim != null && int.TryParse(claim.Value, out var cval))
                        userId = cval;
                }

                if (userId == 0)
                    return BadRequest(new { message = "Missing UserId" });

                if (Media == null || Media.Length == 0)
                    return BadRequest(new { message = "No media file uploaded" });

                byte[] mediaBytes;
                using (var ms = new MemoryStream())
                {
                    await Media.CopyToAsync(ms);
                    mediaBytes = ms.ToArray();
                }

                string uploadedUrl;
                using (var stream = new MemoryStream(mediaBytes))
                {
                    uploadedUrl = await _cloudinaryService.UploadMediaAsync(stream, Media.FileName, MediaType ?? "image");
                }

                if (string.IsNullOrEmpty(uploadedUrl))
                    return StatusCode(500, new { message = "Failed to upload media to Cloudinary" });

                var dto = new CreateStoryDto
                {
                    MediaContent = mediaBytes,
                    MediaType = MediaType ?? "image",
                    Privacy = Privacy ?? "public",
                    FileName = Media.FileName,
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

                var stories = await _storyService.GetFeedStoriesAsync(viewerId);
                return Ok(stories);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
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
