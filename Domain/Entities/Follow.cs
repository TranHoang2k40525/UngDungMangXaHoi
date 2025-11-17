using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UngDungMangXaHoi.Domain.Entities
{
    [Table("Follows")]
    public class Follow
    {
        [Key]
        public int follow_id { get; set; }
        public int follower_id { get; set; }
        public int following_id { get; set; }
        public string status { get; set; } = "accepted"; // pending, accepted, blocked
        public DateTime created_at { get; set; }
    }
}
