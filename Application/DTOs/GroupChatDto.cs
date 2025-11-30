using System.ComponentModel.DataAnnotations;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class CreateGroupRequest
    {
        [Required(ErrorMessage = "Tên nhóm là bắt buộc")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Tên nhóm phải từ 1-100 ký tự")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Danh sách thành viên là bắt buộc")]
        [MinLength(1, ErrorMessage = "Phải có ít nhất 1 thành viên")]
        public List<int> MemberIds { get; set; } = new List<int>();

        [Required(ErrorMessage = "Quyền mời là bắt buộc")]
        [RegularExpression("^(all|admin)$", ErrorMessage = "Quyền mời phải là 'all' hoặc 'admin'")]
        public string InvitePermission { get; set; } = "all";

        [Range(2, 1000, ErrorMessage = "Số lượng thành viên tối đa phải từ 2-1000")]
        public int? MaxMembers { get; set; }
    }

    public class CreateGroupResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public GroupConversationDto? Conversation { get; set; }
    }

    public class InviteToGroupRequest
    {
        [Required(ErrorMessage = "User ID là bắt buộc")]
        public int UserId { get; set; }
    }

    public class InviteToGroupResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public ConversationMemberDto? Member { get; set; }
    }

    public class GroupConversationDto
    {
        public int ConversationId { get; set; }
        public bool IsGroup { get; set; }
        public string? Name { get; set; }
        public string? AvatarUrl { get; set; }
        // ID of the user who created the conversation
        public int? CreatedBy { get; set; }
        public string InvitePermission { get; set; } = "all";
        public int? MaxMembers { get; set; }
        public int CurrentMemberCount { get; set; }
    }

    public class ConversationMemberDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public string Role { get; set; } = "member";
        public DateTime JoinedAt { get; set; }
    }

    public class ChangeRoleRequest
    {
        public string Role { get; set; } = "member";
        public bool TransferOwnership { get; set; } = false;
    }
}
