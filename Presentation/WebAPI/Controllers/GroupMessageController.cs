using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Services;

namespace UngDungMangXaHoi.Presentation.WebAPI.Controllers
{
    /// <summary>
    /// Controller xử lý messages CHỈ CHO GROUP CHAT
    /// KHÔNG xử lý chat 1:1
    /// </summary>
    [ApiController]
    [Route("api/groupmessage")]
    [Authorize] // Yêu cầu JWT token
    public class GroupMessageController : ControllerBase
    {
        private readonly GroupMessageService _messageService;
        private readonly Microsoft.AspNetCore.SignalR.IHubContext<UngDungMangXaHoi.Presentation.WebAPI.Hubs.GroupChatHub> _hubContext;
        private readonly UngDungMangXaHoi.Infrastructure.ExternalServices.CloudinaryService _cloudinaryService;

        public GroupMessageController(GroupMessageService messageService, Microsoft.AspNetCore.SignalR.IHubContext<UngDungMangXaHoi.Presentation.WebAPI.Hubs.GroupChatHub> hubContext, UngDungMangXaHoi.Infrastructure.ExternalServices.CloudinaryService cloudinaryService)
        {
            _messageService = messageService;
            _hubContext = hubContext;
            _cloudinaryService = cloudinaryService;
        }

        /// <summary>
        /// Upload a media/file for group message. Returns a publicly accessible URL.
        /// POST /api/groupmessage/upload (multipart/form-data)
        /// Form fields: file (IFormFile), mediaType (optional: image|video|file)
        /// </summary>
        [HttpPost("upload")]
        public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] string? mediaType)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest(new { success = false, message = "No file uploaded" });

                using (var ms = new System.IO.MemoryStream())
                {
                    await file.CopyToAsync(ms);
                    ms.Position = 0;
                    var uploadedUrl = await _cloudinaryService.UploadMediaAsync(ms, file.FileName, mediaType ?? "file");
                    if (string.IsNullOrEmpty(uploadedUrl))
                        return StatusCode(500, new { success = false, message = "Upload failed" });

                    return Ok(new { success = true, data = new { url = uploadedUrl } });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Gửi message trong GROUP CHAT
        /// POST /api/groupmessage/send
        /// </summary>
        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendGroupMessageDto dto)
        {
            try
            {
                // Get userId from JWT token
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                // Override userId từ token (bảo mật)
                dto.UserId = userId;

                var result = await _messageService.SendMessageAsync(dto);
                
                return Ok(new
                {
                    success = true,
                    message = "Message sent successfully",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Lấy danh sách messages của GROUP CHAT (với pagination)
        /// GET /api/groupmessage/{conversationId}?page=1&pageSize=50
        /// </summary>
        [HttpGet("{conversationId}")]
        public async Task<IActionResult> GetMessages(
            int conversationId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                // Get userId from JWT
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                // Validate
                if (pageSize > 100) pageSize = 100; // Max 100 messages per page
                if (page < 1) page = 1;

                var result = await _messageService.GetMessagesAsync(conversationId, userId, page, pageSize);
                
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Đánh dấu message đã đọc (read receipt)
        /// PUT /api/groupmessage/{messageId}/read
        /// </summary>
        [HttpPut("{messageId}/read")]
        public async Task<IActionResult> MarkAsRead(int messageId)
        {
            try
            {
                // Get userId from JWT
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                // Mark as read and get conversationId for broadcasting
                var convId = await _messageService.MarkAsReadAsync(messageId, userId);
                if (convId == null)
                {
                    return Ok(new { success = false, message = "Failed to mark as read" });
                }

                // Broadcast read receipt via SignalR so other clients receive update
                try
                {
                    await _hubContext.Clients.Group(convId.Value.ToString()).SendAsync("MessageRead", new
                    {
                        messageId,
                        userId,
                        readAt = DateTime.UtcNow
                    });
                }
                catch
                {
                    // Swallow broadcast errors - do not fail the API response
                }

                return Ok(new { success = true, message = "Marked as read" });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Thêm reaction vào message
        /// POST /api/groupmessage/{messageId}/reaction
        /// Body: { "emoji": "❤️" }
        /// </summary>
        [HttpPost("{messageId}/reaction")]
        public async Task<IActionResult> AddReaction(int messageId, [FromBody] AddReactionRequest request)
        {
            try
            {
                // Get userId from JWT
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                if (string.IsNullOrWhiteSpace(request.Emoji))
                {
                    return BadRequest(new { success = false, message = "Emoji is required" });
                }

                var dto = new AddReactionDto
                {
                    MessageId = messageId,
                    UserId = userId,
                    Emoji = request.Emoji
                };

                var result = await _messageService.AddReactionAsync(dto);

                // Broadcast reaction update to group so connected clients receive realtime update
                try
                {
                    // result is GroupMessageDto
                    var convId = result.ConversationId;
                    await _hubContext.Clients.Group(convId.ToString()).SendAsync("ReactionAdded", new
                    {
                        messageId = messageId,
                        userId = userId,
                        emoji = request.Emoji,
                        reactions = result.Reactions
                    });
                }
                catch
                {
                    // Swallow broadcast errors - do not fail the API response
                }

                return Ok(new
                {
                    success = true,
                    message = "Reaction added",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Xóa reaction của user khỏi message
        /// DELETE /api/groupmessage/{messageId}/reaction
        /// Body: { "emoji": "❤️" }
        /// </summary>
        [HttpDelete("{messageId}/reaction")]
        public async Task<IActionResult> RemoveReaction(int messageId, [FromBody] AddReactionRequest request)
        {
            try
            {
                // Get userId from JWT
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                if (string.IsNullOrWhiteSpace(request.Emoji))
                {
                    return BadRequest(new { success = false, message = "Emoji is required" });
                }

                var result = await _messageService.RemoveReactionAsync(messageId, userId, request.Emoji);

                // Broadcast reaction removal to group so connected clients receive realtime update
                try
                {
                    var convId = result.ConversationId;
                    await _hubContext.Clients.Group(convId.ToString()).SendAsync("ReactionRemoved", new
                    {
                        messageId = messageId,
                        userId = userId,
                        emoji = request.Emoji,
                        reactions = result.Reactions
                    });
                }
                catch
                {
                    // ignore
                }

                return Ok(new
                {
                    success = true,
                    message = "Reaction removed",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Lấy thread (replies) của message
        /// GET /api/groupmessage/{messageId}/thread
        /// </summary>
        [HttpGet("{messageId}/thread")]
        public async Task<IActionResult> GetThread(int messageId)
        {
            try
            {
                // Get userId from JWT
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                var result = await _messageService.GetThreadAsync(messageId, userId);
                
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Xóa message (soft delete)
        /// DELETE /api/groupmessage/{messageId}
        /// </summary>
        [HttpDelete("{messageId}")]
        public async Task<IActionResult> DeleteMessage(int messageId)
        {
            try
            {
                // Get userId from JWT
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                var result = await _messageService.DeleteMessageAsync(messageId, userId);
                
                return Ok(new
                {
                    success = result,
                    message = result ? "Message deleted" : "Failed to delete message"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Pin a message (group only)
        /// POST /api/groupmessage/{conversationId}/pin/{messageId}
        /// </summary>
        [HttpPost("{conversationId}/pin/{messageId}")]
        public async Task<IActionResult> PinMessage(int conversationId, int messageId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                    return Unauthorized(new { message = "Invalid token" });

                var (success, error, messageDto) = await _messageService.PinMessageAsync(conversationId, messageId, userId);
                if (!success) return BadRequest(new { success = false, message = error });

                // Broadcast via SignalR
                await _hubContext.Clients.Group(conversationId.ToString()).SendAsync("MessagePinned", new
                {
                    conversationId,
                    messageId,
                    message = messageDto,
                    pinnedBy = userId,
                    timestamp = DateTime.UtcNow
                });

                return Ok(new { success = true, data = messageDto });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{conversationId}/pin/{messageId}")]
        public async Task<IActionResult> UnpinMessage(int conversationId, int messageId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                    return Unauthorized(new { message = "Invalid token" });

                var (success, error) = await _messageService.UnpinMessageAsync(conversationId, messageId, userId);
                if (!success) return BadRequest(new { success = false, message = error });

                await _hubContext.Clients.Group(conversationId.ToString()).SendAsync("MessageUnpinned", new
                {
                    conversationId,
                    messageId,
                    unpinnedBy = userId,
                    timestamp = DateTime.UtcNow
                });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Get pinned messages for a group
        /// GET /api/groupmessage/{conversationId}/pinned
        /// </summary>
        [HttpGet("{conversationId}/pinned")]
        public async Task<IActionResult> GetPinnedMessages(int conversationId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                    return Unauthorized(new { message = "Invalid token" });

                var (success, error, messages) = await _messageService.GetPinnedMessagesAsync(conversationId, userId);
                if (!success) return BadRequest(new { success = false, message = error });

                return Ok(new { success = true, data = messages });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Get media & links for a group
        /// GET /api/groupmessage/{conversationId}/media?type=image|video|file|link
        /// </summary>
        [HttpGet("{conversationId}/media")]
        public async Task<IActionResult> GetMediaMessages(int conversationId, [FromQuery] string? type)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                    return Unauthorized(new { message = "Invalid token" });

                var (success, error, messages) = await _messageService.GetMediaMessagesAsync(conversationId, userId, type);
                if (!success) return BadRequest(new { success = false, message = error });

                return Ok(new { success = true, data = messages });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }

    // ============================================
    // Request DTOs for API
    // ============================================

    public class AddReactionRequest
    {
        public string Emoji { get; set; } = string.Empty;
    }
}
