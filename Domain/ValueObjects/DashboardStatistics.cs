using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Domain.ValueObjects
{
   
        public class TopEngagedPostResult
        {
            public int PostId { get; set; }
            public string? Caption { get; set; }
            public DateTime CreatedAt { get; set; }
            public int UserId { get; set; }

            public string Username { get; set; } = string.Empty;

            public string FullName { get; set; } = string.Empty;
            public string? AvatarUrl { get; set; }
            public string? AccountType { get; set; }
            public int  ReactionCount { get; set; }
            public int CommentCount { get; set; }
            public List<PostMediaInfo> Media { get; set; } = new();

        }
        public class PostMediaInfo
        {
            public string MediaUrl { get; set; } = string.Empty;
            public string MediaType { get; set; } = "Image";
            public int MediaOrder { get; set; }
        }
        public enum GroupByOption
        {
            Day,
            Week,
            Month,
            Year
        }
    
}
