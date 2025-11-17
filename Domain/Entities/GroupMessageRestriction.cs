using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UngDungMangXaHoi.Domain.Entities
{
    [Table("MessageRestrictions")]
    public class GroupMessageRestriction
    {
        [Key]
        public int restriction_id { get; set; }
        
        // Người bị hạn chế
        public int restricted_user_id { get; set; }
        
        // Người thiết lập hạn chế
        public int restricting_user_id { get; set; }
        
        public DateTime created_at { get; set; }
        
        // Navigation properties
        public User RestrictedUser { get; set; } = null!;
        public User RestrictingUser { get; set; } = null!;
    }
}
