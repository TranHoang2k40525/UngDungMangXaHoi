using System;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class ReactionDto
    {
        public int ReactionId { get; set; }
        public int PostId { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = null!;
        public string? AvatarUrl { get; set; }
        public ReactionType ReactionType { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }

    public class ReactionCountDto
    {
        public ReactionType ReactionType { get; set; }
        public int Count { get; set; }
    }

    public class CreateReactionDto
    {
        public int PostId { get; set; }
        public ReactionType ReactionType { get; set; }
    }

    public class ReactionSummaryDto
    {
        public int TotalReactions { get; set; }
        public List<ReactionCountDto> ReactionCounts { get; set; } = new();
        public ReactionType? UserReaction { get; set; }  // Reaction của user hiện tại (nếu có)
    }
}
