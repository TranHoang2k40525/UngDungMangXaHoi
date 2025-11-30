using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Application.DTOs;
using Microsoft.AspNetCore.Http;
using UngDungMangXaHoi.Application.Services;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    /// <summary>
    /// GroupChatController - Quản lý nhóm chat và mời thành viên
    /// </summary>
    [ApiController]
    [Route("api/groupchat")]
    [Authorize(Policy = "UserOnly")]
    public class GroupChatController : ControllerBase
    {
        private readonly GroupChatService _groupChatService;
        private readonly IUserRepository _userRepository;
        private readonly UngDungMangXaHoi.Infrastructure.ExternalServices.CloudinaryService _cloudinaryService;
        private readonly UngDungMangXaHoi.WebAPI.Services.ISignalRService _signalRService;

        public GroupChatController(GroupChatService groupChatService, IUserRepository userRepository, UngDungMangXaHoi.Infrastructure.ExternalServices.CloudinaryService cloudinaryService, UngDungMangXaHoi.WebAPI.Services.ISignalRService signalRService)
        {
            _groupChatService = groupChatService;
            _userRepository = userRepository;
            _cloudinaryService = cloudinaryService;
            _signalRService = signalRService;
        }

        /// <summary>
        /// Upload and persist a new group avatar
        /// POST /api/groupchat/{conversationId}/avatar (multipart/form-data)
        /// Form field: file (IFormFile)
        /// </summary>
        [HttpPost("{conversationId}/avatar")]
        public async Task<IActionResult> UpdateGroupAvatar(int conversationId, IFormFile file)
        {
            try
            {
                var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(accountIdClaim) || !int.TryParse(accountIdClaim, out int accountId))
                {
                    return Unauthorized(new { message = "Không thể xác thực người dùng" });
                }

                var user = await _userRepository.GetByAccountIdAsync(accountId);
                if (user == null) return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });

                if (file == null || file.Length == 0) return BadRequest(new { success = false, message = "No file uploaded" });

                // Upload to Cloudinary (or configured storage)
                string uploadedUrl;
                using (var ms = new System.IO.MemoryStream())
                {
                    await file.CopyToAsync(ms);
                    ms.Position = 0;
                    uploadedUrl = await _cloudinaryService.UploadMediaAsync(ms, file.FileName, "image");
                }

                if (string.IsNullOrEmpty(uploadedUrl)) return StatusCode(500, new { success = false, message = "Upload failed" });

                // Persist to DB via service
                var (success, error) = await _groupChatService.UpdateGroupAvatarAsync(conversationId, uploadedUrl, user.user_id);
                if (!success) return BadRequest(new { success = false, message = error });

                // Broadcast via SignalR so connected clients update
                try
                {
                    await _signalRService.NotifyGroupAvatarUpdate(conversationId.ToString(), uploadedUrl, user.user_id.ToString());
                }
                catch { /* do not fail on broadcast */ }

                return Ok(new { success = true, data = new { avatarUrl = uploadedUrl } });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật tên nhóm (persist & broadcast)
        /// PUT /api/groupchat/{conversationId}/name
        /// Body: { "name": "New Group Name" }
        /// </summary>
        [HttpPut("{conversationId}/name")]
        public async Task<IActionResult> UpdateGroupName(int conversationId, [FromBody] dynamic body)
        {
            try
            {
                var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(accountIdClaim) || !int.TryParse(accountIdClaim, out int accountId))
                {
                    return Unauthorized(new { message = "Không thể xác thực người dùng" });
                }

                var user = await _userRepository.GetByAccountIdAsync(accountId);
                if (user == null) return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });

                string newName = body?.name;
                if (string.IsNullOrEmpty(newName)) return BadRequest(new { success = false, message = "Tên nhóm không được để trống" });

                var (success, error) = await _groupChatService.UpdateGroupNameAsync(conversationId, newName, user.user_id);
                if (!success) return BadRequest(new { success = false, message = error });

                // Broadcast via SignalR so connected clients update
                try
                {
                    await _signalRService.NotifyGroupNameUpdate(conversationId.ToString(), newName, user.user_id.ToString());
                }
                catch { /* do not fail on broadcast */ }

                return Ok(new { success = true, data = new { name = newName } });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Tạo nhóm chat mới
        /// POST /api/groupchat/create
        /// </summary>
        /// <param name="request">Thông tin nhóm chat</param>
        /// <returns>Thông tin nhóm chat vừa tạo</returns>
        [HttpPost("create")]
        public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest request)
        {
            try
            {
                // Lấy account_id từ JWT token
                var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(accountIdClaim) || !int.TryParse(accountIdClaim, out int accountId))
                {
                    return Unauthorized(new { message = "Không thể xác thực người dùng" });
                }

                // Lấy user_id từ account_id
                var user = await _userRepository.GetByAccountIdAsync(accountId);
                if (user == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
                }

                // Gọi service để tạo nhóm với user_id
                var (success, errorMessage, conversationId) = await _groupChatService.CreateGroupAsync(
                    user.user_id,
                    request.Name,
                    request.MemberIds,
                    request.InvitePermission,
                    request.MaxMembers
                );

                if (!success)
                {
                    return BadRequest(new CreateGroupResponse
                    {
                        Success = false,
                        Message = errorMessage
                    });
                }

                // Lấy thông tin conversation vừa tạo
                var conversation = await _groupChatService.GetConversationAsync(conversationId!.Value);
                if (conversation == null)
                {
                    return StatusCode(500, new { message = "Lỗi khi lấy thông tin nhóm chat" });
                }

                var groupConversationDto = new GroupConversationDto
                {
                    ConversationId = conversation.conversation_id,
                    IsGroup = conversation.is_group,
                    Name = conversation.name,
                    AvatarUrl = conversation.avatar_url,
                    InvitePermission = conversation.invite_permission,
                    MaxMembers = conversation.max_members,
                    CurrentMemberCount = conversation.Members.Count
                };

                return Ok(new CreateGroupResponse
                {
                    Success = true,
                    Message = "Tạo nhóm chat thành công",
                    Conversation = groupConversationDto
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new CreateGroupResponse
                {
                    Success = false,
                    Message = $"Lỗi server: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Lấy danh sách tất cả nhóm chat mà user là thành viên
        /// GET /api/groupchat/my-groups
        /// </summary>
        [HttpGet("my-groups")]
        public async Task<IActionResult> GetMyGroups()
        {
            try
            {
                // Lấy account_id từ JWT token
                var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(accountIdClaim) || !int.TryParse(accountIdClaim, out int accountId))
                {
                    return Unauthorized(new { message = "Không thể xác thực người dùng" });
                }

                // Lấy user_id từ account_id
                var user = await _userRepository.GetByAccountIdAsync(accountId);
                if (user == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
                }

                // Lấy danh sách nhóm
                var groups = await _groupChatService.GetUserGroupsAsync(user.user_id);

                var groupDtos = groups.Select(g => new GroupConversationDto
                {
                    ConversationId = g.conversation_id,
                    IsGroup = g.is_group,
                    Name = g.name,
                    AvatarUrl = g.avatar_url,
                    InvitePermission = g.invite_permission,
                    MaxMembers = g.max_members,
                    CurrentMemberCount = g.Members.Count
                }).ToList();

                return Ok(new { groups = groupDtos });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        /// <summary>
        /// Mời một người dùng vào nhóm chat
        /// POST /api/groupchat/{conversationId}/invite
        /// </summary>
        /// <param name="conversationId">ID của nhóm chat</param>
        /// <param name="request">Thông tin người được mời</param>
        /// <returns>Kết quả mời thành viên</returns>
        [HttpPost("{conversationId}/invite")]
        public async Task<IActionResult> InviteUserToGroup(int conversationId, [FromBody] InviteToGroupRequest request)
        {
            try
            {
                // Lấy account_id từ JWT token
                var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(accountIdClaim) || !int.TryParse(accountIdClaim, out int accountId))
                {
                    return Unauthorized(new { message = "Không thể xác thực người dùng" });
                }

                // Lấy user_id từ account_id
                var user = await _userRepository.GetByAccountIdAsync(accountId);
                if (user == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
                }

                // Gọi service để xử lý logic mời thành viên
                var (success, errorMessage) = await _groupChatService.InviteUserToGroupAsync(
                    conversationId, 
                    user.user_id, 
                    request.UserId);

                if (!success)
                {
                    return BadRequest(new InviteToGroupResponse
                    {
                        Success = false,
                        Message = errorMessage
                    });
                }

                // Lấy thông tin conversation sau khi thêm thành viên
                var conversation = await _groupChatService.GetConversationAsync(conversationId);
                if (conversation == null)
                {
                    return NotFound(new { message = "Không tìm thấy nhóm chat" });
                }

                // Tìm thành viên vừa được thêm
                var newMember = conversation.Members.FirstOrDefault(m => m.user_id == request.UserId);
                if (newMember == null)
                {
                    return StatusCode(500, new { message = "Lỗi khi thêm thành viên" });
                }

                return Ok(new InviteToGroupResponse
                {
                    Success = true,
                    Message = "Đã mời thành viên vào nhóm thành công",
                    Member = new ConversationMemberDto
                    {
                        Id = newMember.id,
                        UserId = newMember.user_id,
                        Username = newMember.User.username.Value,
                        FullName = newMember.User.full_name,
                        AvatarUrl = newMember.User.avatar_url?.Value,
                        Role = newMember.role,
                        JoinedAt = newMember.joined_at
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new InviteToGroupResponse
                {
                    Success = false,
                    Message = $"Lỗi server: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Lấy thông tin chi tiết về nhóm chat
        /// GET /api/groupchat/{conversationId}
        /// </summary>
        [HttpGet("{conversationId}")]
        public async Task<IActionResult> GetConversation(int conversationId)
        {
            try
            {
                // Lấy account_id từ JWT token
                var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(accountIdClaim) || !int.TryParse(accountIdClaim, out int accountId))
                {
                    return Unauthorized(new { message = "Không thể xác thực người dùng" });
                }

                // Lấy user_id từ account_id
                var user = await _userRepository.GetByAccountIdAsync(accountId);
                if (user == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
                }

                // Kiểm tra user có phải thành viên không
                var isMember = await _groupChatService.IsMemberAsync(conversationId, user.user_id);
                if (!isMember)
                {
                    return Forbid("Bạn không phải là thành viên của nhóm này");
                }

                var conversation = await _groupChatService.GetConversationAsync(conversationId);
                if (conversation == null)
                {
                    return NotFound(new { message = "Không tìm thấy nhóm chat" });
                }

                var groupConversationDto = new GroupConversationDto
                {
                    ConversationId = conversation.conversation_id,
                    IsGroup = conversation.is_group,
                    Name = conversation.name,
                    AvatarUrl = conversation.avatar_url,
                    CreatedBy = conversation.created_by,
                    InvitePermission = conversation.invite_permission,
                    MaxMembers = conversation.max_members,
                    CurrentMemberCount = conversation.Members.Count
                };

                return Ok(groupConversationDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        /// <summary>
        /// Lấy danh sách thành viên của nhóm chat
        /// GET /api/groupchat/{conversationId}/members
        /// </summary>
        [HttpGet("{conversationId}/members")]
        public async Task<IActionResult> GetMembers(int conversationId)
        {
            try
            {
                // Lấy account_id từ JWT token
                var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(accountIdClaim) || !int.TryParse(accountIdClaim, out int accountId))
                {
                    return Unauthorized(new { message = "Không thể xác thực người dùng" });
                }

                // Lấy user_id từ account_id
                var user = await _userRepository.GetByAccountIdAsync(accountId);
                if (user == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
                }

                // Kiểm tra user có phải thành viên không
                var isMember = await _groupChatService.IsMemberAsync(conversationId, user.user_id);
                if (!isMember)
                {
                    return Forbid("Bạn không phải là thành viên của nhóm này");
                }

                var conversation = await _groupChatService.GetConversationAsync(conversationId);
                if (conversation == null)
                {
                    return NotFound(new { message = "Không tìm thấy nhóm chat" });
                }

                var members = conversation.Members.Select(m => new ConversationMemberDto
                {
                    Id = m.id,
                    UserId = m.user_id,
                    Username = m.User.username.Value,
                    FullName = m.User.full_name,
                    AvatarUrl = m.User.avatar_url?.Value,
                    Role = m.role,
                    JoinedAt = m.joined_at
                }).ToList();

                return Ok(new { members });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        /// <summary>
        /// Xóa nhóm chat (chỉ người tạo nhóm - creator/admin)
        /// DELETE /api/groupchat/{conversationId}
        /// </summary>
        [HttpDelete("{conversationId}")]
        public async Task<IActionResult> DeleteConversation(int conversationId)
        {
            try
            {
                var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(accountIdClaim) || !int.TryParse(accountIdClaim, out int accountId))
                {
                    return Unauthorized(new { message = "Không thể xác thực người dùng" });
                }

                var user = await _userRepository.GetByAccountIdAsync(accountId);
                if (user == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
                }

                var (success, errorMessage) = await _groupChatService.DeleteGroupAsync(conversationId, user.user_id);
                if (!success)
                {
                    return BadRequest(new { success = false, message = errorMessage });
                }

                // Broadcast group deletion to other members
                try
                {
                    await _signalRService.NotifyGroupDeleted(conversationId.ToString(), user.user_id.ToString());
                }
                catch
                {
                    // Do not fail the request if broadcasting fails
                }

                return Ok(new { success = true, message = "Đã xóa nhóm chat" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Lỗi server: {ex.Message}" });
            }
        }

        /// <summary>
        /// Remove a member from a group
        /// DELETE /api/groupchat/{conversationId}/members/{userId}
        /// </summary>
        [HttpDelete("{conversationId}/members/{userId}")]
        public async Task<IActionResult> RemoveMember(int conversationId, int userId)
        {
            try
            {
                var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(accountIdClaim) || !int.TryParse(accountIdClaim, out int accountId))
                {
                    return Unauthorized(new { message = "Không thể xác thực người dùng" });
                }

                var user = await _userRepository.GetByAccountIdAsync(accountId);
                if (user == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
                }

                var (success, errorMessage) = await _groupChatService.RemoveMemberAsync(conversationId, user.user_id, userId);
                if (!success)
                {
                    return BadRequest(new { success = false, message = errorMessage });
                }

                // Broadcast member removal so connected clients in the group update in realtime
                try
                {
                    await _signalRService.NotifyMemberRemoved(conversationId.ToString(), userId.ToString(), user.user_id.ToString());
                }
                catch
                {
                    // Do not fail the request if broadcast fails
                }

                return Ok(new { success = true, message = "Đã xóa thành viên khỏi nhóm" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Lỗi server: {ex.Message}" });
            }
        }

        /// <summary>
        /// Current user leaves the group (self removal)
        /// POST /api/groupchat/{conversationId}/leave
        /// </summary>
        [HttpPost("{conversationId}/leave")]
        public async Task<IActionResult> LeaveGroup(int conversationId)
        {
            try
            {
                var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(accountIdClaim) || !int.TryParse(accountIdClaim, out int accountId))
                {
                    return Unauthorized(new { message = "Không thể xác thực người dùng" });
                }

                var user = await _userRepository.GetByAccountIdAsync(accountId);
                if (user == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
                }

                var (success, errorMessage) = await _groupChatService.LeaveGroupAsync(conversationId, user.user_id);
                if (!success) return BadRequest(new { success = false, message = errorMessage });

                // Broadcast member removal
                try
                {
                    await _signalRService.NotifyMemberRemoved(conversationId.ToString(), user.user_id.ToString(), user.user_id.ToString());
                }
                catch { /* do not fail the request if broadcast fails */ }

                return Ok(new { success = true, message = "Đã rời khỏi nhóm" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Lỗi server: {ex.Message}" });
            }
        }

        /// <summary>
        /// Change member role (e.g., promote to admin)
        /// PUT /api/groupchat/{conversationId}/members/{userId}/role
        /// Body: { "role": "admin", "transferOwnership": true }
        /// </summary>
        [HttpPut("{conversationId}/members/{userId}/role")]
        public async Task<IActionResult> ChangeMemberRole(int conversationId, int userId, [FromBody] ChangeRoleRequest request)
        {
            try
            {
                var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(accountIdClaim) || !int.TryParse(accountIdClaim, out int accountId))
                {
                    return Unauthorized(new { message = "Không thể xác thực người dùng" });
                }

                var user = await _userRepository.GetByAccountIdAsync(accountId);
                if (user == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
                }

                var (success, errorMessage) = await _groupChatService.ChangeMemberRoleAsync(conversationId, user.user_id, userId, request.Role, request.TransferOwnership);
                if (!success)
                {
                    return BadRequest(new { success = false, message = errorMessage });
                }

                return Ok(new { success = true, message = "Đã cập nhật vai trò thành viên" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Lỗi server: {ex.Message}" });
            }
        }

        // ChangeRoleRequest moved to Application.DTOs.ChangeRoleRequest
    }
}
