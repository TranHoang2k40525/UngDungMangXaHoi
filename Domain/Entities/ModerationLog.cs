using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class ModerationLog
    {
        public int LogID { get; set; }
        public int ModerationID { get; set; }
        public string ActionTaken { get; set; } = null!;   
        public int? AdminID { get; set; }
        public DateTime ActionAt { get; set; }
        public string? Note { get; set; }
        // Navigation properties
        public ContentModeration ContentModeration { get; set; } = null!;
        public Admin? Admin { get; set; }
    }
}
