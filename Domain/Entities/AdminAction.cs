using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class AdminAction
    {
        public int action_id { get; set; }
        public int? admin_id { get; set; }
        public required string action { get; set; }
        public string? target_type { get; set; }  // e.g., "Post", "Comment", "User"
        public int? target_id { get; set; }  // ID of the target entity
        public string? reason { get; set; }
        public DateTime created_at { get; set; }
        public Admin? Admin { get; set; }


    }
}
