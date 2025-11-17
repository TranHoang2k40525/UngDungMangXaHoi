using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UngDungMangXaHoi.Domain.Entities
{
    [Table("Conversations")]
    public class GroupConversation
    {
        [Key]
        public int conversation_id { get; set; }
        
        public bool is_group { get; set; }
        
        [MaxLength(100)]
        public string? name { get; set; }
        
        [MaxLength(255)]
        public string? avatar_url { get; set; }
        
        public DateTime created_at { get; set; }
        // ID của người tạo nhóm (creator) để dễ quản lý quyền
        public int? created_by { get; set; }
        
        // Cấu hình quyền mời: "all" = tất cả thành viên, "admin" = chỉ admin
        [MaxLength(20)]
        public string invite_permission { get; set; } = "all";
        
        // Giới hạn số thành viên tối đa (null = không giới hạn)
        public int? max_members { get; set; }
        
        // Navigation property
        public ICollection<GroupConversationMember> Members { get; set; } = new List<GroupConversationMember>();
    }
}
