using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Services;

namespace UngDungMangXaHoi.Presentation.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // All authenticated users
    public class MessagesController : ControllerBase
    {
        private readonly MessageService _messageService;

        public MessagesController(MessageService messageService)
        {
            _messageService = messageService;
        }

        private int GetCurrentUserId()
        {
            // JWT sử dụng "nameid" cho user ID, không phải "user_id"
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                              ?? User.FindFirst("nameid")?.Value 
                              ?? User.FindFirst("user_id")?.Value;
            
            Console.WriteLine($"[MessagesController] GetCurrentUserId - found claim: {userIdClaim}");
            Console.WriteLine($"[MessagesController] All claims: {string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}"))}");
            
            if (string.IsNullOrEmpty(userIdClaim))
            {
                throw new UnauthorizedAccessException("User ID not found in token");
            }
            
            return int.Parse(userIdClaim);
        }

        // GET: api/messages/conversations
        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            try
            {
                var userId = GetCurrentUserId();
                var conversations = await _messageService.GetUserConversationsAsync(userId);

                return Ok(new ConversationListResponseDto
                {
                    success = true,
                    message = "Conversations retrieved successfully",
                    data = conversations
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ConversationListResponseDto
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // GET: api/messages/conversations/{otherUserId}
        [HttpGet("conversations/{otherUserId}")]
        public async Task<IActionResult> GetConversationDetail(int otherUserId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                var userId = GetCurrentUserId();
                Console.WriteLine($"[MessagesController] GetConversationDetail - userId: {userId}, otherUserId: {otherUserId}, page: {page}, pageSize: {pageSize}");
                
                var conversation = await _messageService.GetConversationDetailAsync(userId, otherUserId, page, pageSize);
                
                if (conversation != null)
                {
                    Console.WriteLine($"[MessagesController] Returning {conversation.messages.Count} messages (requested pageSize: {pageSize})");
                }

                if (conversation == null)
                {
                    Console.WriteLine($"[MessagesController] Conversation not found or no mutual follow");
                    return NotFound(new ConversationDetailResponseDto
                    {
                        success = false,
                        message = "Conversation not found or you don't have permission to access it"
                    });
                }

                Console.WriteLine($"[MessagesController] Conversation found: {conversation.conversation_id}");
                return Ok(new ConversationDetailResponseDto
                {
                    success = true,
                    message = "Conversation retrieved successfully",
                    data = conversation
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MessagesController] Error: {ex.Message}");
                return BadRequest(new ConversationDetailResponseDto
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // POST: api/messages/send
        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var message = await _messageService.SendMessageAsync(userId, dto);

                return Ok(new MessageResponseDto
                {
                    success = true,
                    message = "Message sent successfully",
                    data = message
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new MessageResponseDto
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // PUT: api/messages/read/{conversationId}
        [HttpPut("read/{conversationId}")]
        public async Task<IActionResult> MarkAsRead(int conversationId)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _messageService.MarkAsReadAsync(conversationId, userId);

                return Ok(new
                {
                    success = true,
                    message = "Messages marked as read"
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

        // DELETE: api/messages/{messageId}
        [HttpDelete("{messageId}")]
        public async Task<IActionResult> DeleteMessage(int messageId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var success = await _messageService.DeleteMessageAsync(messageId, userId);

                if (!success)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Message not found or you don't have permission to delete it"
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Message deleted successfully"
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

        // GET: api/messages/mutual-followers
        [HttpGet("mutual-followers")]
        public async Task<IActionResult> GetMutualFollowers()
        {
            try
            {
                var userId = GetCurrentUserId();
                Console.WriteLine($"[MessagesController] GetMutualFollowers called - userId from JWT: {userId}");
                
                var users = await _messageService.GetMutualFollowersAsync(userId);
                Console.WriteLine($"[MessagesController] Found {users.Count} mutual followers");

                return Ok(new
                {
                    success = true,
                    message = "Mutual followers retrieved successfully",
                    data = users
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MessagesController] Error: {ex.Message}");
                Console.WriteLine($"[MessagesController] StackTrace: {ex.StackTrace}");
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // POST: api/messages/recall/{messageId}
        [HttpPost("recall/{messageId}")]
        public async Task<IActionResult> RecallMessage(int messageId)
        {
            try
            {
                var userId = GetCurrentUserId();
                Console.WriteLine($"[MessagesController] RecallMessage called - messageId: {messageId}, userId: {userId}");
                
                var recalledMessage = await _messageService.RecallMessageAsync(messageId, userId);
                
                if (recalledMessage == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Cannot recall message. Message not found or you are not the sender."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Message recalled successfully",
                    data = recalledMessage
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MessagesController] Error: {ex.Message}");
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
    }
}
