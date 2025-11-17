using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UngDungMangXaHoi.Domain.Entities
{
    [Table("Blocks")]
    public class Block
    {
        [Key]
        public int block_id { get; set; }
        
        // Người chặn
        public int blocker_id { get; set; }
        
        // Người bị chặn
        public int blocked_id { get; set; }
        
        public DateTime created_at { get; set; }
        
        // Navigation properties
        public User Blocker { get; set; } = null!;
        public User Blocked { get; set; } = null!;
    }
}
