using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UngDungMangXaHoi.Domain.Entities
{
    [Table("GroupMessageReactions")]
    public class GroupMessageReaction
    {
        public int message_id { get; set; }

        public int user_id { get; set; }

        [MaxLength(20)]
        public string reaction_type { get; set; } = string.Empty;

        public DateTime created_at { get; set; } = DateTime.UtcNow;
    }
}
