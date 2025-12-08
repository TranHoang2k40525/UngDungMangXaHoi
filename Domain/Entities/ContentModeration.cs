using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Entities
{
    public class ContentModeration
    {
        public int ModerationID { get; set; }
    public string ContentType { get; set; } = string.Empty; // "Post" or "Comment"
        public int ContentID { get; set; }
        public int AccountId { get; set; } 
        public int? PostId { get; set; }
        public int? CommentId { get; set; }
        public double AIConfidence { get; set; } = 0.0;
    public string ToxicLabel { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // "pending", "approved", "rejected"
        public DateTime? CreatedAt { get; set; }
        // Navigation properties
        public Post? Post { get; set; }
        public Comment? Comment { get; set; }
            public Account Account { get; set; } = null!;

        public ICollection<ModerationLog> ModerationLogs { get; set; } = new List<ModerationLog>(); 

    }

}
