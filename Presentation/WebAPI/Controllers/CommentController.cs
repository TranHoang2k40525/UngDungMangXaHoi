using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using UngDungMangXaHoi.Application.UseCases.Comments;
using UngDungMangXaHoi.Domain.DTOs;
using UngDungMangXaHoi.Application.Validators;
using System.Security.Claims;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CommentController : ControllerBase
    {
        private readonly AddComment _addComment;
        private readonly DeleteComment _deleteComment;

        public CommentController(AddComment addComment, DeleteComment deleteComment)
        {
            _addComment = addComment;
            _deleteComment = deleteComment;
        }

        [HttpPost]
        public async Task<IActionResult> AddComment([FromBody] CommentCreateDto commentCreateDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == null)
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                // Validate input
                var validationResult = CommentValidator.ValidateCommentCreate(commentCreateDto);
                if (!validationResult.IsValid)
                {
                    return BadRequest(new { message = validationResult.GetErrorMessage() });
                }

                var comment = await _addComment.ExecuteAsync(userId.Value, commentCreateDto);
                return CreatedAtAction(nameof(GetComment), new { id = comment.Id }, comment);
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
                return StatusCode(500, new { message = "An error occurred while adding the comment" });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetComment(Guid id)
        {
            try
            {
                // TODO: Implement GetComment use case
                return Ok(new { message = "Get comment endpoint not implemented yet", id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while getting the comment" });
            }
        }

        [HttpGet("post/{postId}")]
        public async Task<IActionResult> GetCommentsByPost(Guid postId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                // TODO: Implement GetCommentsByPost use case
                return Ok(new { message = "Get comments by post endpoint not implemented yet", postId, pageNumber, pageSize });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while getting comments" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateComment(Guid id, [FromBody] CommentUpdateDto commentUpdateDto)
        {
            try
            {
                // TODO: Implement UpdateComment use case
                return Ok(new { message = "Update comment endpoint not implemented yet", id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while updating the comment" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(Guid id)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == null)
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                var result = await _deleteComment.ExecuteAsync(id, userId.Value);
                if (result)
                {
                    return NoContent();
                }
                else
                {
                    return NotFound(new { message = "Comment not found" });
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
                return StatusCode(500, new { message = "An error occurred while deleting the comment" });
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

