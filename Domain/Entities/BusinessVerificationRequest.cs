using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Entities
{
    public enum VerificationStatus
        {
            Pending,
            Approved,
            Rejected,
            Expired
        }
    public class BusinessVerificationRequest
    {
        
        public int request_id { get; set; }
        public int account_id { get; set; }
        public DateTime submitted_at { get; set; }
        public VerificationStatus status { get; set; } = VerificationStatus.Pending;
        public string? documents_url { get; set; } // URL to uploaded verification documents
        public int? assigned_admin_id { get; set; } // Admin handling the request
        public DateTime? reviewed_at { get; set; } // When the admin reviewed the request
        public string? reviewed_notes { get; set; } // Admin notes on the verification
        public DateTime? expires_at { get; set; } // When the verification expires
        public Account Accounts { get; set; } = null!;
        public Admin? AssignedAdmin { get; set; }
    }
}
