using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class AccountSanction
    {
        public int sanction_id { get; set; }
        public required int account_id { get; set; } 
        public int? admin_id { get; set; }
        public string action_type { get; set; } = null!; // e.g., "Warning", "Temporary Ban", "Permanent Ban"
        public string reason { get; set; } = null!;  // nguyên nhân bị sanction
        public DateTime start_at { get; set; }
        public DateTime? end_at { get; set; } // null if permanent ban
        public bool is_active { get; set; } = true;
        // Navigation properties
        public Admin? Admin { get; set; }
        public Account Account { get; set; } = null!;
    }
}
