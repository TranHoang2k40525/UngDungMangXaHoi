using Microsoft.Extensions.Options;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics.Metrics;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Interfaces;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using static Microsoft.Extensions.Logging.EventSource.LoggingEventSource;


namespace UngDungMangXaHoi.Application.Services
{
    public class DashBoardService : IDashBoardService
    {
        private readonly IDashboardRepository _dashboardRepository;
        public DashBoardService(IDashboardRepository dashboardRepository)
        {
            _dashboardRepository = dashboardRepository;
        }
        public async Task<List<UserNewByDateDto>> GetUserNewDate (DateTime fromDate, DateTime toDate, SortUserNewByDateOptionDto option)
        {
            var domainOption = (SortUserNewByDateOption)option;
            var context = await _dashboardRepository.GetUserNewAsync(fromDate, toDate, domainOption);
            var resultDto = context.Select(c => new UserNewByDateDto
            {
                DisplayTime = option == SortUserNewByDateOptionDto.Month
                  ? c.TimeLabel.ToString("MM/yyyy")     // Nếu chọn Tháng -> Hiện 11/2025
                  : c.TimeLabel.ToString("dd/MM/yyyy"), // Còn lại -> Hiện 30/11/2025
                Count = c.Count
            }).ToList();
            return resultDto;

        }
        public async Task<NumberUserActiveDto> GetUserActive()
        {
            var context = await _dashboardRepository.GetUserActiveAsync();
            var resultDto = new NumberUserActiveDto
            {
                Count = context.Count
            };
            return resultDto;
        }
       public async Task<BusinessGrowthChartDto> GetBusinessGrowthChartAsync(DateTime startDate, DateTime endDate, GroupByOptionDto groupBy)
        {
            if(startDate > endDate)
            {
                throw new ArgumentException("startDate phải nhỏ hơn hoặc bằng endDate");

            }
            var domainOption1 = (GroupByOption)groupBy;
            
            var data = await _dashboardRepository.GetBusinessRegistrationGrowthAsync(startDate, endDate, domainOption1);
            var total = await _dashboardRepository.GetTotalBusinessAccountsAsync();
            var labels = data.Select(d => FormatPeriodLabel(d.Period, domainOption1)).ToList();
            var counts = data.Select(d => d.Count).ToList();
            var resultDto = new BusinessGrowthChartDto
            {
                Labels = labels,
                Counts = counts,
                TotalBusinessAccounts = total
            };
            return resultDto;
        }
        public async Task<RevenueChartDto> GetRevenueChartAsync(DateTime startDate, DateTime endDate, GroupByOptionDto groupBy)
        {
            if (startDate > endDate)
                throw new ArgumentException("startDate phải nhỏ hơn hoặc bằng endDate");
            var domainOption = (GroupByOption)groupBy;
            var data = await _dashboardRepository.GetRevenueByPeriodAsync(startDate, endDate, domainOption);
            var toalRevenue = await _dashboardRepository.GetTotalRevenueAsync();
            var lables = data.Select(d=> FormatPeriodLabel(d.Period, domainOption)).ToList();
            var revenues = data.Select (d => d.Revenue).ToList();
            var resultDto = new RevenueChartDto
            {
                lables = lables,
                Revenues = revenues,
                TotalRevenue = toalRevenue
            };
            return resultDto;

        }
        public async Task<PostGrowthChartDto> GetPostGrowthChartAsync(DateTime startDate, DateTime endDate, GroupByOptionDto groupBy)
        {
                       if (startDate > endDate)
                throw new ArgumentException("startDate phải nhỏ hơn hoặc bằng endDate");
            var domainOption = (GroupByOption)groupBy;
            var data = await _dashboardRepository.GetPostGrowthByPeriodAsync(startDate, endDate, domainOption);
            var totalPosts = await _dashboardRepository.GetTotalPostsAsync();
            var labels = data.Select(d => FormatPeriodLabel(d.Period, domainOption)).ToList();
            var counts = data.Select(d => d.Count).ToList();
            var resultDto = new PostGrowthChartDto
            {
                Labels = labels,
                Counts = counts,
                TotalPosts = totalPosts
            };
            return resultDto;

        }
        public async Task<TopKeywordsDto> GetTopKeywordsAsync(int topN = 10, DateTime? startDate = null, DateTime? endDate = null)
        {
            if(topN < 0)
            {
                throw new ArgumentException("topN phai lon hon 0");
            }
            if (startDate.HasValue && endDate.HasValue && startDate > endDate) {
                throw new ArgumentException("startDate phải nhỏ hơn hoặc bằng endDate");

            }
            var data = await _dashboardRepository.GetTopKeywordsAsync(topN, startDate, endDate);
            var totalData = await _dashboardRepository.GetTotalSearchesAsync(startDate,endDate);

            var keyworkItems = data.Select(d => new KeywordItemDto
            {
                Keyword = d.Keyword,
                SearchCount = d.SearchCount,
                Tyle = totalData > 0 ? Math.Round((decimal)d.SearchCount / totalData * 100, 2) : 0,
            }).ToList();
            return new TopKeywordsDto
            {
                Keywords = keyworkItems,
                TotalSearches = totalData,
            };
        }
        public async Task<TopEngagedPostsDto> GetTopEngagedPostsAsync(int topN = 10, DateTime? startDate = null, DateTime? endDate = null) 
        {
            if (topN < 0)
            {
                throw new ArgumentException("topN phai lon hon 0");

            }
            if (startDate.HasValue && endDate.HasValue && startDate > endDate)
                throw new ArgumentException("startDate phải nhỏ hơn hoặc bằng endDate");
            var data =await _dashboardRepository.GetTopEngagedPostsAsync(topN, startDate, endDate);
            
            var result =  data.Select(p => new EngagedPostItemDto
            {
                PostId = p.PostId,
                Caption = p.Caption,
                CreatedAt = p.CreatedAt,

                Author = new PostAuthorDto
                {
                    UserId = p.UserId,
                    UserName = p.Username,
                    FullName = p.FullName,
                    AvatarUrl = p.AvatarUrl,
                    accountType = p.AccountType
                },
                Media = p.Media.Select(m => new PostMediaItemDto
                {
                    MediaUrl = m.MediaUrl,
                    MediaType = m.MediaType,
                    MediaOrder = m.MediaOrder
                }).ToList(),

                Engagement = new EngagementStatsDto
                {
                    ReactionCount = p.ReactionCount,
                    CommentCount = p.CommentCount,
                    TotalEngagement = p.ReactionCount + p.CommentCount 
                }
            }).ToList();
            return  new TopEngagedPostsDto
            {
                Posts = result
            };
            
        }
        public async Task<AdminDashboardSummaryDto> GetDashboardSummaryAsync(DateTime startDate, DateTime endDate, GroupByOptionDto chartGroupBy = GroupByOptionDto.Day)
        {
            if (startDate > endDate)
            {
                throw new ArgumentException("startDate phải nhỏ hơn hoặc bằng endDate");

            }
            // Lấy tất cả dữ liệu song song
            var businessGrowthTask = GetBusinessGrowthChartAsync(startDate, endDate, chartGroupBy);
            var revenueTask = GetRevenueChartAsync(startDate, endDate, chartGroupBy);
            var postGrowthTask = GetPostGrowthChartAsync(startDate, endDate, chartGroupBy);
            var topKeywordsTask = GetTopKeywordsAsync(10, startDate, endDate);
            var topPostsTask = GetTopEngagedPostsAsync(10, startDate, endDate);

            // Overall stats
            var totalUsersTask = _dashboardRepository.GetTotalUsersAsync();
            var totalBusinessTask = _dashboardRepository.GetTotalBusinessAccountsAsync();
            var totalPostsTask = _dashboardRepository.GetTotalPostsAsync();
            var totalRevenueTask = _dashboardRepository.GetTotalRevenueAsync();
            var totalSearchesTask = _dashboardRepository.GetTotalSearchesAsync(null, null);

            // Đợi tất cả hoàn thành
            await Task.WhenAll(
                businessGrowthTask,
                revenueTask,
                postGrowthTask,
                topKeywordsTask,
                topPostsTask,
                totalUsersTask,
                totalBusinessTask,
                totalPostsTask,
                totalRevenueTask,
                totalSearchesTask
            );
            return new AdminDashboardSummaryDto
            {
                BusinessGrowth = await businessGrowthTask,
                Revenue = await revenueTask,
                PostGrowth = await postGrowthTask,
                TopKeywords = await topKeywordsTask,
                TopPosts = await topPostsTask,
                OverallStats = new OverallStatsDto
                {
                    TotalUsers = await totalUsersTask,
                    TotalBusinessAccounts = await totalBusinessTask,
                    TotalPosts = await totalPostsTask,
                    TotalRevenue = await totalRevenueTask,
                    TotalSearches = await totalSearchesTask
                }
            };
        }

        private string FormatPeriodLabel(DateTime date, GroupByOption groupBy)
        {
            return groupBy switch
            {
                GroupByOption.Day => date.ToString("dd/MM"),       // VD: 06/12
                GroupByOption.Week => $"Tuần {date:dd/MM}",        // VD: Tuần 01/12
                GroupByOption.Month => date.ToString("MM/yyyy"),   // VD: 12/2025
                GroupByOption.Year => date.ToString("yyyy"),       // VD: 2025
                _ => date.ToString("dd/MM/yyyy")
            };
        }
        private int GetWeekOfYear(DateTime date)
        {
            var culture = CultureInfo.CurrentCulture;
            var weekRule = culture.DateTimeFormat.CalendarWeekRule;
            var firstDayOfWeek = culture.DateTimeFormat.FirstDayOfWeek;
            return culture.Calendar.GetWeekOfYear(date, weekRule, firstDayOfWeek);
        }
    }
}
