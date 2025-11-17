using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    public class GroupChatService
    {
        private readonly IGroupConversationRepository _conversationRepository;
        private readonly IUserRepository _userRepository;
        private readonly IBlockRepository _blockRepository;
        private readonly IGroupMessageRestrictionRepository _messageRestrictionRepository;

        public GroupChatService(
            IGroupConversationRepository conversationRepository,
            IUserRepository userRepository,
            IBlockRepository blockRepository,
            IGroupMessageRestrictionRepository messageRestrictionRepository)
        {
            _conversationRepository = conversationRepository;
            _userRepository = userRepository;
            _blockRepository = blockRepository;
            _messageRestrictionRepository = messageRestrictionRepository;
        }

        /// <summary>
        /// Tạo nhóm chat mới
        /// </summary>
        /// <param name="creatorId">ID của người tạo nhóm (sẽ là admin)</param>
        /// <param name="name">Tên nhóm</param>
        /// <param name="memberIds">Danh sách ID thành viên (không bao gồm creator)</param>
        /// <param name="invitePermission">Quyền mời: "all" hoặc "admin"</param>
        /// <param name="maxMembers">Số lượng thành viên tối đa</param>
        /// <returns>Tuple (Success, ErrorMessage, ConversationId)</returns>
        public async Task<(bool Success, string? ErrorMessage, int? ConversationId)> CreateGroupAsync(
            int creatorId,
            string name,
            List<int> memberIds,
            string invitePermission = "all",
            int? maxMembers = null)
        {
            // 1. Kiểm tra creator có tồn tại không
            var creator = await _userRepository.GetByIdAsync(creatorId);
            if (creator == null)
            {
                return (false, "Người tạo nhóm không tồn tại", null);
            }

            // 2. Validate tên nhóm
            if (string.IsNullOrWhiteSpace(name))
            {
                return (false, "Tên nhóm không được để trống", null);
            }

            // 3. Validate invite permission
            if (invitePermission != "all" && invitePermission != "admin")
            {
                return (false, "Quyền mời phải là 'all' hoặc 'admin'", null);
            }

            // 4. Validate max members
            if (maxMembers.HasValue && maxMembers.Value < 2)
            {
                return (false, "Số lượng thành viên tối đa phải >= 2", null);
            }

            // 5. Kiểm tra số lượng thành viên
            var totalMembers = memberIds.Count + 1; // +1 cho creator
            if (maxMembers.HasValue && totalMembers > maxMembers.Value)
            {
                return (false, $"Số lượng thành viên ({totalMembers}) vượt quá giới hạn ({maxMembers.Value})", null);
            }

            // 6. Kiểm tra các members có tồn tại không
            var members = new List<User>();
            foreach (var memberId in memberIds)
            {
                var member = await _userRepository.GetByIdAsync(memberId);
                if (member == null)
                {
                    return (false, $"Người dùng ID {memberId} không tồn tại", null);
                }
                members.Add(member);
            }

            // 7. Tạo conversation mới
            var conversation = new GroupConversation
            {
                is_group = true,
                name = name,
                created_at = DateTime.UtcNow,
                created_by = creatorId,
                invite_permission = invitePermission,
                max_members = maxMembers
            };

            var createdConversation = await _conversationRepository.CreateAsync(conversation);
            if (createdConversation == null)
            {
                return (false, "Lỗi khi tạo nhóm chat", null);
            }

            // 8. Thêm creator làm admin
            var creatorMember = new GroupConversationMember
            {
                conversation_id = createdConversation.conversation_id,
                user_id = creatorId,
                role = "admin",
                joined_at = DateTime.UtcNow
            };
            await _conversationRepository.AddMemberAsync(creatorMember);

            // 9. Thêm các members khác
            foreach (var memberId in memberIds)
            {
                var conversationMember = new GroupConversationMember
                {
                    conversation_id = createdConversation.conversation_id,
                    user_id = memberId,
                    role = "member",
                    joined_at = DateTime.UtcNow
                };
                await _conversationRepository.AddMemberAsync(conversationMember);
            }

            return (true, null, createdConversation.conversation_id);
        }

        /// <summary>
        /// Mời một user vào group chat với đầy đủ validation
        /// </summary>
        /// <param name="conversationId">ID của nhóm chat</param>
        /// <param name="inviterId">ID của người mời</param>
        /// <param name="inviteeId">ID của người được mời</param>
        /// <returns>Tuple (Success, ErrorMessage)</returns>
        public async Task<(bool Success, string? ErrorMessage)> InviteUserToGroupAsync(
            int conversationId, 
            int inviterId, 
            int inviteeId)
        {
            // 1. Kiểm tra conversation có tồn tại và là group không
            var conversation = await _conversationRepository.GetByIdWithMembersAsync(conversationId);
            if (conversation == null)
            {
                return (false, "Nhóm chat không tồn tại");
            }

            if (!conversation.is_group)
            {
                return (false, "Chỉ có thể mời thành viên vào nhóm chat");
            }

            // 2. Kiểm tra inviter có phải là thành viên của nhóm không
            var inviterMember = await _conversationRepository.GetMemberAsync(conversationId, inviterId);
            if (inviterMember == null)
            {
                return (false, "Bạn không phải là thành viên của nhóm này");
            }

            // 3. Kiểm tra quyền mời thành viên
            if (conversation.invite_permission == "admin")
            {
                // Chỉ admin mới có quyền mời
                if (inviterMember.role != "admin")
                {
                    return (false, "Chỉ admin mới có quyền mời thành viên vào nhóm");
                }
            }
            // Nếu invite_permission = "all" thì tất cả thành viên đều có thể mời

            // 4. Kiểm tra invitee có tồn tại không
            var invitee = await _userRepository.GetByIdAsync(inviteeId);
            if (invitee == null)
            {
                return (false, "Người dùng được mời không tồn tại");
            }

            // 5. Kiểm tra invitee đã là thành viên chưa
            var isAlreadyMember = await _conversationRepository.IsMemberAsync(conversationId, inviteeId);
            if (isAlreadyMember)
            {
                return (false, "Người dùng này đã là thành viên của nhóm");
            }

            // 6. Kiểm tra giới hạn số lượng thành viên
            if (conversation.max_members.HasValue)
            {
                var currentMemberCount = await _conversationRepository.GetMemberCountAsync(conversationId);
                if (currentMemberCount >= conversation.max_members.Value)
                {
                    return (false, $"Nhóm đã đạt giới hạn {conversation.max_members.Value} thành viên");
                }
            }

            // 7. Kiểm tra hai người có follow nhau không
            var inviterFollowsInvitee = await _userRepository.IsFollowingAsync(inviterId, inviteeId);
            var inviteeFollowsInviter = await _userRepository.IsFollowingAsync(inviteeId, inviterId);

            if (!inviterFollowsInvitee || !inviteeFollowsInviter)
            {
                return (false, "Chỉ có thể mời người dùng mà cả hai đều follow nhau");
            }

            // 8. Kiểm tra có chặn nhau không
            var areBlocking = await _blockRepository.AreBlockingEachOtherAsync(inviterId, inviteeId);
            if (areBlocking)
            {
                return (false, "Không thể mời người dùng đã bị chặn hoặc đang chặn bạn");
            }

            // 9. Kiểm tra có hạn chế tin nhắn không
            var areRestricting = await _messageRestrictionRepository.AreRestrictingEachOtherAsync(inviterId, inviteeId);
            if (areRestricting)
            {
                return (false, "Không thể mời người dùng đã bị hạn chế tin nhắn");
            }

            // 10. Tất cả điều kiện đã thỏa mãn, thêm thành viên vào nhóm
            var newMember = new GroupConversationMember
            {
                conversation_id = conversationId,
                user_id = inviteeId,
                role = "member",
                joined_at = DateTime.UtcNow
            };

            await _conversationRepository.AddMemberAsync(newMember);

            return (true, null);
        }

        /// <summary>
        /// Lấy thông tin chi tiết về conversation
        /// </summary>
        public async Task<GroupConversation?> GetConversationAsync(int conversationId)
        {
            return await _conversationRepository.GetByIdWithMembersAsync(conversationId);
        }

        /// <summary>
        /// Kiểm tra user có phải là thành viên của conversation không
        /// </summary>
        public async Task<bool> IsMemberAsync(int conversationId, int userId)
        {
            return await _conversationRepository.IsMemberAsync(conversationId, userId);
        }

        /// <summary>
        /// Kiểm tra user có phải là admin của conversation không
        /// </summary>
        public async Task<bool> IsAdminAsync(int conversationId, int userId)
        {
            return await _conversationRepository.IsAdminAsync(conversationId, userId);
        }

        /// <summary>
        /// Delete a group conversation. Only the original creator (admin who created the group)
        /// is allowed to fully delete the conversation.
        /// </summary>
        public async Task<(bool Success, string? ErrorMessage)> DeleteGroupAsync(int conversationId, int requesterId)
        {
            var conversation = await _conversationRepository.GetByIdWithMembersAsync(conversationId);
            if (conversation == null)
            {
                return (false, "Nhóm chat không tồn tại");
            }

            if (!conversation.is_group)
            {
                return (false, "Chỉ có thể xóa nhóm chat");
            }

            // Find member record for requester
            var member = conversation.Members.FirstOrDefault(m => m.user_id == requesterId);
            if (member == null)
            {
                return (false, "Bạn không phải là thành viên của nhóm này");
            }

            // Use explicit created_by field when available
            if (conversation.created_by.HasValue)
            {
                if (conversation.created_by.Value != requesterId)
                {
                    return (false, "Chỉ người tạo nhóm (creator) mới có quyền xóa nhóm");
                }
            }
            else
            {
                // Fallback to previous logic: earliest admin
                var creator = conversation.Members
                    .Where(m => m.role == "admin")
                    .OrderBy(m => m.joined_at)
                    .FirstOrDefault();

                if (creator == null || creator.user_id != requesterId)
                {
                    return (false, "Chỉ người tạo nhóm (admin) mới có quyền xóa nhóm");
                }
            }

            // Perform deletion via repository
            await _conversationRepository.DeleteConversationAsync(conversationId);

            return (true, null);
        }

        /// <summary>
        /// Remove a member from a conversation. Requester must be admin or creator.
        /// </summary>
        public async Task<(bool Success, string? ErrorMessage)> RemoveMemberAsync(int conversationId, int requesterId, int targetUserId)
        {
            var conversation = await _conversationRepository.GetByIdWithMembersAsync(conversationId);
            if (conversation == null) return (false, "Nhóm chat không tồn tại");

            var requesterMember = conversation.Members.FirstOrDefault(m => m.user_id == requesterId);
            if (requesterMember == null) return (false, "Bạn không phải là thành viên của nhóm này");

            // Only admin/creator can remove others
            var isRequesterAdmin = requesterMember.role == "admin" || (conversation.created_by.HasValue && conversation.created_by.Value == requesterId);
            if (!isRequesterAdmin) return (false, "Chỉ admin mới có quyền xóa thành viên");

            // Can't remove self here (use leave flow) - but allow if admin wants to remove self
            await _conversationRepository.RemoveMemberAsync(conversationId, targetUserId);
            return (true, null);
        }

        /// <summary>
        /// Leave group (self removal). Requester can remove themselves without being admin.
        /// </summary>
        public async Task<(bool Success, string? ErrorMessage)> LeaveGroupAsync(int conversationId, int userId)
        {
            var conversation = await _conversationRepository.GetByIdWithMembersAsync(conversationId);
            if (conversation == null) return (false, "Nhóm chat không tồn tại");

            var member = conversation.Members.FirstOrDefault(m => m.user_id == userId);
            if (member == null) return (false, "Bạn không phải là thành viên của nhóm này");

            // Remove member
            await _conversationRepository.RemoveMemberAsync(conversationId, userId);

            return (true, null);
        }

        /// <summary>
        /// Change a member's role. Requester must be admin/creator. If transferOwnership=true and role='admin',
        /// requester will be demoted to 'member'.
        /// </summary>
        public async Task<(bool Success, string? ErrorMessage)> ChangeMemberRoleAsync(int conversationId, int requesterId, int targetUserId, string role, bool transferOwnership = false)
        {
            var conversation = await _conversationRepository.GetByIdWithMembersAsync(conversationId);
            if (conversation == null) return (false, "Nhóm chat không tồn tại");

            var requesterMember = conversation.Members.FirstOrDefault(m => m.user_id == requesterId);
            if (requesterMember == null) return (false, "Bạn không phải là thành viên của nhóm này");

            var isRequesterAdmin = requesterMember.role == "admin" || (conversation.created_by.HasValue && conversation.created_by.Value == requesterId);
            if (!isRequesterAdmin) return (false, "Chỉ admin mới có quyền thay đổi vai trò");

            var targetMember = conversation.Members.FirstOrDefault(m => m.user_id == targetUserId);
            if (targetMember == null) return (false, "Người dùng không phải là thành viên của nhóm");

            // Update role
            await _conversationRepository.UpdateMemberRoleAsync(conversationId, targetUserId, role);

            // If transferOwnership requested and role == 'admin', demote requester to member
            if (transferOwnership && role == "admin")
            {
                await _conversationRepository.UpdateMemberRoleAsync(conversationId, requesterId, "member");
            }

            return (true, null);
        }

        /// <summary>
        /// Lấy danh sách tất cả nhóm chat mà user là thành viên
        /// </summary>
        public async Task<List<GroupConversation>> GetUserGroupsAsync(int userId)
        {
            return await _conversationRepository.GetUserGroupsAsync(userId);
        }

        /// <summary>
        /// Cập nhật avatar của nhóm (persist vào DB)
        /// </summary>
        public async Task<(bool Success, string? ErrorMessage)> UpdateGroupAvatarAsync(int conversationId, string avatarUrl, int requesterId)
        {
            var conversation = await _conversationRepository.GetByIdWithMembersAsync(conversationId);
            if (conversation == null) return (false, "Nhóm chat không tồn tại");

            // Kiểm tra requester có phải admin hoặc creator
            var member = conversation.Members.FirstOrDefault(m => m.user_id == requesterId);
            var isAdmin = member != null && (member.role == "admin" || (conversation.created_by.HasValue && conversation.created_by.Value == requesterId));
            if (!isAdmin) return (false, "Chỉ admin hoặc người tạo nhóm mới có thể thay đổi ảnh nhóm");

            conversation.avatar_url = avatarUrl;
            await _conversationRepository.UpdateAsync(conversation);

            return (true, null);
        }

        /// <summary>
        /// Cập nhật tên nhóm và persist vào DB
        /// </summary>
        public async Task<(bool Success, string? ErrorMessage)> UpdateGroupNameAsync(int conversationId, string newName, int requesterId)
        {
            var conversation = await _conversationRepository.GetByIdWithMembersAsync(conversationId);
            if (conversation == null) return (false, "Nhóm chat không tồn tại");

            // Kiểm tra requester có phải admin hoặc creator
            var member = conversation.Members.FirstOrDefault(m => m.user_id == requesterId);
            var isAdmin = member != null && (member.role == "admin" || (conversation.created_by.HasValue && conversation.created_by.Value == requesterId));
            if (!isAdmin) return (false, "Chỉ admin hoặc người tạo nhóm mới có thể thay đổi tên nhóm");

            if (string.IsNullOrWhiteSpace(newName)) return (false, "Tên nhóm không được để trống");

            conversation.name = newName;
            await _conversationRepository.UpdateAsync(conversation);

            return (true, null);
        }
    }
}
