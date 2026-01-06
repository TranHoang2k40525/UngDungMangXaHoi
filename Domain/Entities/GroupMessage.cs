using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UngDungMangXaHoi.Domain.Entities
{
    [Table("Messages")]
    public class GroupMessage
    {
        [Key]
        public int message_id { get; set; }
        
        [Required]
        public int conversation_id { get; set; }
        
        [Required]
        [Column("sender_id")] // Map to existing DB column sender_id
        public int user_id { get; set; }
        
        // Content của tin nhắn - hỗ trợ TEXT, số, mixed
        [Column(TypeName = "NVARCHAR(1000)")] // Match existing DB column
        public string? content { get; set; }
        
        // Type: text, image, video, file, sticker, audio
        [MaxLength(20)]
        public string message_type { get; set; } = "text";
        
        // URL của file (image, video, file)
        [MaxLength(255)]
        [Column("media_url")] // Map to existing DB column media_url
        public string? file_url { get; set; }
        
        // Reply/Thread support - ID của tin nhắn gốc
        [Column("reply_to")] // Map to existing DB column reply_to
        public int? reply_to_message_id { get; set; }
        
        // Soft delete
        public bool is_deleted { get; set; } = false;
        
        public DateTime created_at { get; set; } = DateTime.UtcNow;
        
        public DateTime? updated_at { get; set; } = DateTime.UtcNow;

    // Pinned message support
    // Ghim tin nhắn trong group chat
    public bool is_pinned { get; set; } = false;

    public DateTime? pinned_at { get; set; }

    // user_id của người ghim
    public int? pinned_by { get; set; }
        
        // Navigation properties - Không dùng [ForeignKey] attribute vì đã config trong Configuration
        public GroupConversation? Conversation { get; set; }
        public User? User { get; set; }
        public GroupMessage? ReplyToMessage { get; set; }
        public ICollection<GroupMessage> Replies { get; set; } = new List<GroupMessage>();
    }
}