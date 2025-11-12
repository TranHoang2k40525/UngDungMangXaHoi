using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UngDungMangXaHoi.Domain.Entities
{
    public enum MessageType
    {
        Text,
        Image,
        Video,
        Audio,
        File
    }

    public enum MessageStatus
    {
        Sent,
        Delivered,
        Read
    }

    [Table("MessagesNew")]
    public class Message
    {
        [Key]
        public int message_id { get; set; }
        
        public int conversation_id { get; set; }
        public int sender_id { get; set; }
        
        [Required]
        public string content { get; set; } = null!;
        
        public MessageType message_type { get; set; } = MessageType.Text;
        public MessageStatus status { get; set; } = MessageStatus.Sent;
        
        public string? media_url { get; set; }
        public string? thumbnail_url { get; set; }
        
        public bool is_deleted { get; set; } = false;
        public bool is_recalled { get; set; } = false; // Đánh dấu tin nhắn đã bị thu hồi
        public DateTime created_at { get; set; }
        public DateTime? updated_at { get; set; }
        public DateTime? read_at { get; set; }
        
        // Navigation properties
        [ForeignKey("conversation_id")]
        public Conversation Conversation { get; set; } = null!;
        
        [ForeignKey("sender_id")]
        public User Sender { get; set; } = null!;
    }
}
