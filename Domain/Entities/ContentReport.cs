using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Entities
{
    public enum ReportStatus
    {
        Pending,
        InProgress,
        Handled
    }
    public class ContentReport
    {
        public int report_id { get; set; }// id cua bao cao
        public int? reporter_account_id { get; set; }// id cua nguoi bao cao
        public string content_type { get; set; } = null!; // e.g., "Post", "Comment"
        public int content_id { get; set; }// id cua noi dung bi bao cao
        public string? reason { get; set; } // ly do bao cao
        public ReportStatus status { get; set; } = ReportStatus.Pending; // Pending/InProgress/Handled
        public int? assigned_admin_id { get; set; }// id cua admin xu ly bao cao
        public DateTime created_at { get; set; }// thoi gian tao bao cao
        public DateTime? handled_at { get; set; } // thoi gian xu ly
        public string? handled_notes { get; set; } // ghi chu xu ly
        // Navigation properties    
        public Account? ReporterAccount { get; set; }
        public Admin? AssignedAdmin { get; set; }

    }
}
