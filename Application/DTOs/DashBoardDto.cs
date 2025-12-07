using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class UserNewByDateDto 
    {
        public string? DisplayTime { get; set; }
        public double Count { get; set; }
    }
    public enum SortUserNewByDateOptionDto
    {
        Day,
        Week,
        Month
    }
    public class NumberUserActiveDto
    {
        public double Count { get; set; }
    }
    public class ChartDataDto
    {
        public string? Lable { get; set; } // Ngày tháng hoặc tên 
        public decimal Value { get; set; } // Giá trị số luong or doanh thu
    }
   
    
    public class TopPostDto // Bài viết được tương tác nhiều nhất( 10 bai viết)
    {
        public int PostId { get; set; }
        public string? Caption { get; set; }
        public int LikeCount { get; set; }
        public int CommentCount { get; set; }
    }
    public class BusinessGrowthChartDto
    {
        public List<string> Labels { get; set; } = new();
        public List<int> Counts { get; set; } = new();
        public int TotalBusinessAccounts { get; set; }
    }
    // Bieu do doanh thu
    public class RevenueChartDto
    {
        public List<string> lables { get; set; } = new();
        public List<decimal> Revenues { get; set; } = new();
        public decimal TotalRevenue { get; set; }
    }
    // bieu do tang truong bai dang
    public class PostGrowthChartDto 
    {
        public List<string> Labels { get; set; } = new();
        public List<int> Counts { get; set; } = new();
        public int TotalPosts { get; set; } 
    }
    //     // Top từ khóa tìm kiếm
    public class TopKeywordsDto
    {
        public List<KeywordItemDto> Keywords { get; set; } = new();
        public int TotalSearches { get; set; }
    }
    public class KeywordItemDto
    {
        public string? Keyword { get; set; }
        public int SearchCount { get; set; }
        public decimal Tyle { get; set; }

    }
    public class TopEngagedPostsDto
    {
        public List<EngagedPostItemDto> Posts { get; set; } = new();
    }
    public class EngagedPostItemDto
    {
        public int PostId { get; set; }
        public string? Caption { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public PostAuthorDto Author { get; set; } = new();
        public List<PostMediaItemDto> Media { get; set; } = new();
        public EngagementStatsDto Engagement { get; set; } = new();



    }
    public class PostAuthorDto
    {
        public int UserId { get; set; } 
        public string UserName { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? AvatarUrl { get; set; } = string.Empty;
        public string? accountType { get; set; } 
    }
    public class PostMediaItemDto
    {
        public string? MediaUrl { get; set; } = string.Empty;
        public string? MediaType { get; set; } = "Image";// image, video
        public int MediaOrder { get; set; }

    } 
    public class EngagementStatsDto
    {
        public int ReactionCount { get; set; }
        public int CommentCount { get; set; }
        public int ShareCount { get; set; }
        public int TotalEngagement { get; set; }
    }
    public class AdminDashboardSummaryDto
    {
        public BusinessGrowthChartDto? BusinessGrowth { get; set; }
        public RevenueChartDto? Revenue { get; set; }

        public PostGrowthChartDto? PostGrowth { get; set; }

        public TopKeywordsDto? TopKeywords { get; set; }

        public TopEngagedPostsDto? TopPosts { get; set; }

        public OverallStatsDto? OverallStats { get; set; }



    }
    public class OverallStatsDto
    {
        public int TotalUsers { get; set; }
        public int TotalBusinessAccounts { get; set; }
        public int TotalPosts { get; set; }
        public decimal TotalRevenue { get; set; }
        public int TotalSearches { get; set; }
    }
    public enum GroupByOptionDto
    {
        Day,
        Week,
        Month,
        Year
    }
}
