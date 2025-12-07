using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
namespace UngDungMangXaHoi.Application.Interfaces
{
    public interface IDashBoardService
    {
        Task<List<UserNewByDateDto>> GetUserNewDate(DateTime fromDate, DateTime toDate, SortUserNewByDateOptionDto option);
        Task<NumberUserActiveDto> GetUserActive();
        Task<BusinessGrowthChartDto> GetBusinessGrowthChartAsync(DateTime startDate, DateTime endDate, GroupByOptionDto groupBy);
        Task<RevenueChartDto> GetRevenueChartAsync(DateTime startDate, DateTime endDate, GroupByOptionDto groupBy);
        Task<PostGrowthChartDto> GetPostGrowthChartAsync(DateTime startDate, DateTime endDate, GroupByOptionDto groupBy);
        Task<TopKeywordsDto> GetTopKeywordsAsync(int topN = 10, DateTime? startDate = null, DateTime? endDate = null);
        Task<TopEngagedPostsDto> GetTopEngagedPostsAsync(int topN = 10, DateTime? startDate = null, DateTime? endDate = null);
        Task<AdminDashboardSummaryDto> GetDashboardSummaryAsync(DateTime startDate, DateTime endDate, GroupByOptionDto chartGroupBy = GroupByOptionDto.Day);
    }
}
