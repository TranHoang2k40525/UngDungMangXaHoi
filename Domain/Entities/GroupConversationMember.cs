using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UngDungMangXaHoi.Domain.Entities
{
    [Table("ConversationMembers")]
    public class GroupConversationMember
    {
        [Key]
        public int id { get; set; }
        
        public int conversation_id { get; set; }
        
        public int user_id { get; set; }
        
        // "admin" hoặc "member"
        [MaxLength(20)]
        public string role { get; set; } = "member";
        
        public DateTime joined_at { get; set; }
        
        // Last message id that this member has read (nullable)
        public int? last_read_message_id { get; set; }

        // When the member last read messages
        public DateTime? last_read_at { get; set; }
        
        // Navigation properties
        public GroupConversation Conversation { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
