using System;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class MessageDto
    {
        public int message_id { get; set; }
        public int conversation_id { get; set; }
        public int sender_id { get; set; }
        public string content { get; set; } = null!;
        public string message_type { get; set; } = "Text";
        public string status { get; set; } = "Sent";
        public string? media_url { get; set; }
        public string? thumbnail_url { get; set; }
        public bool is_recalled { get; set; } = false; // Đánh dấu tin nhắn đã thu hồi
        public DateTime created_at { get; set; }
        public DateTime? read_at { get; set; }
        
        // Sender info
        public string sender_username { get; set; } = null!;
        public string sender_full_name { get; set; } = null!;
        public string? sender_avatar_url { get; set; }
    }

    public class SendMessageDto
    {
        public int receiver_id { get; set; }
        public string content { get; set; } = null!;
        public string message_type { get; set; } = "Text";
        public string? media_url { get; set; }
        public string? thumbnail_url { get; set; }
    }

    public class MessageResponseDto
    {
        public bool success { get; set; }
        public string? message { get; set; }
        public MessageDto? data { get; set; }
    }
}
