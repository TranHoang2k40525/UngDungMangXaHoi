using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UngDungMangXaHoi.Domain.Entities
{
    [Table("GroupMessageReads")]
    public class GroupMessageRead
    {
        public int message_id { get; set; }

        public int user_id { get; set; }

        public DateTime read_at { get; set; } = DateTime.UtcNow;
    }
}
