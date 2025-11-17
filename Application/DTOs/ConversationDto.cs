using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class ConversationDto
    {
        public int conversation_id { get; set; }
        public int other_user_id { get; set; }
        public string other_user_username { get; set; } = null!;
        public string other_user_full_name { get; set; } = null!;
        public string? other_user_avatar_url { get; set; }
        public string? other_user_bio { get; set; }
        public DateTime? other_user_last_seen { get; set; } // Last seen của user kia
        
        public MessageDto? last_message { get; set; }
        public int unread_count { get; set; }
        
        public DateTime created_at { get; set; }
        public DateTime? updated_at { get; set; }
    }

    public class ConversationListResponseDto
    {
        public bool success { get; set; }
        public string? message { get; set; }
        public List<ConversationDto>? data { get; set; }
    }

    public class ConversationDetailResponseDto
    {
        public bool success { get; set; }
        public string? message { get; set; }
        public ConversationDetailDto? data { get; set; }
    }

    public class ConversationDetailDto
    {
        public int conversation_id { get; set; }
        public int other_user_id { get; set; }
        public string other_user_username { get; set; } = null!;
        public string other_user_full_name { get; set; } = null!;
        public string? other_user_avatar_url { get; set; }
        public string? other_user_bio { get; set; }
        public List<MessageDto> messages { get; set; } = new();
        public int total_messages { get; set; }
        public int page { get; set; }
        public int page_size { get; set; }
    }
}
