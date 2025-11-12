using System;
using System.Collections.Generic;

namespace UngDungMangXaHoi.Application.DTOs
{    /// <summary>
    /// DTO cho kết quả tìm kiếm user
    /// </summary>
    public class SearchUserDto
    {
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public string? Bio { get; set; }
        public bool IsFollowing { get; set; }
        public int FollowersCount { get; set; }
        
        // Priority ranking: 1 = Following, 2 = Messaged Before, 3 = Stranger
        public int Priority { get; set; } = 3; // Default: Stranger
        public bool HasMessagedBefore { get; set; } = false;
    }    /// <summary>
    /// DTO cho kết quả tìm kiếm post
    /// </summary>
    public class SearchPostDto
    {
        public int PostId { get; set; }
        public string Caption { get; set; } = string.Empty;
        public string? Location { get; set; }
        public DateTime CreatedAt { get; set; }
        public int LikesCount { get; set; }
        public int CommentsCount { get; set; }
        
        // Thông tin user đăng bài
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? UserAvatarUrl { get; set; }
        
        // Media đầu tiên để hiển thị preview
        public string? ThumbnailUrl { get; set; }
        public string? MediaType { get; set; } // "Image" hoặc "Video"
        
        // Priority ranking: 1 = From Following/Messaged, 2 = From Stranger
        public int Priority { get; set; } = 2; // Default: Stranger
        public bool IsFromFollowing { get; set; } = false;
    }

    /// <summary>
    /// DTO cho kết quả tìm kiếm tổng hợp
    /// </summary>
    public class SearchAllResultDto
    {
        public List<SearchUserDto> Users { get; set; } = new();
        public List<SearchPostDto> Posts { get; set; } = new();
        public int TotalUsersCount { get; set; }
        public int TotalPostsCount { get; set; }
    }

    /// <summary>
    /// DTO cho phân trang kết quả tìm kiếm
    /// </summary>
    public class SearchResultDto<T>
    {
        public List<T> Results { get; set; } = new();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
        public bool HasNextPage => PageNumber < TotalPages;
        public bool HasPreviousPage => PageNumber > 1;
    }
}
