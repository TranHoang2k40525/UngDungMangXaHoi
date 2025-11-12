using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UngDungMangXaHoi.Domain.Entities
{
    [Table("ConversationsNew")]
    public class Conversation
    {
        [Key]
        public int conversation_id { get; set; }
        
        public int user1_id { get; set; }
        public int user2_id { get; set; }
        
        public DateTime created_at { get; set; }
        public DateTime? updated_at { get; set; }
        
        // Navigation properties
        [ForeignKey("user1_id")]
        public User User1 { get; set; } = null!;
        
        [ForeignKey("user2_id")]
        public User User2 { get; set; } = null!;
    }
}
