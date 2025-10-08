using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using UngDungMangXaHoi.Application.UseCases.Posts;
using UngDungMangXaHoi.Domain.DTOs;
using UngDungMangXaHoi.Application.Validators;
using System.Security.Claims;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PostController : ControllerBase
    {
        private readonly CreatePost _createPost;
        private readonly GetFeed _getFeed;
        private readonly DeletePost _deletePost;

        public PostController(CreatePost createPost, GetFeed getFeed, DeletePost deletePost)
        {
            _createPost = createPost;
            _getFeed = getFeed;
            _deletePost = deletePost;
        }

        [HttpPost]
        public async Task<IActionResult> CreatePost([FromBody] PostCreateDto postCreateDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == null)
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                // Validate input
                var validationResult = PostValidator.ValidatePostCreate(postCreateDto);
                if (!validationResult.IsValid)
                {
                    return BadRequest(new { message = validationResult.GetErrorMessage() });
                }

                var post = await _createPost.ExecuteAsync(userId.Value, postCreateDto);
                return CreatedAtAction(nameof(GetPost), new { id = post.Id }, post);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while creating the post" });
            }
        }

        [HttpGet("feed")]
        public async Task<IActionResult> GetFeed([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == null)
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                var feed = await _getFeed.ExecuteAsync(userId.Value, pageNumber, pageSize);
                return Ok(feed);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while getting the feed" });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetPost(Guid id)
        {
            try
            {
                // TODO: Implement GetPost use case
                return Ok(new { message = "Get post endpoint not implemented yet", id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while getting the post" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePost(Guid id, [FromBody] PostUpdateDto postUpdateDto)
        {
            try
            {
                // TODO: Implement UpdatePost use case
                return Ok(new { message = "Update post endpoint not implemented yet", id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while updating the post" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePost(Guid id)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == null)
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                var result = await _deletePost.ExecuteAsync(id, userId.Value);
                if (result)
                {
                    return NoContent();
                }
                else
                {
                    return NotFound(new { message = "Post not found" });
                }
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while deleting the post" });
            }
        }

        private Guid? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out Guid userId))
            {
                return userId;
            }
            return null;
        }
    }
}

