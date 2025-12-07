using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.ValueObjects;


namespace UngDungMangXaHoi.Domain.Interfaces
{
   public interface IDashboardRepository
    {
        Task<List<UserNewByDateResult>> GetUserNewAsync(DateTime fromDate, DateTime toDate, SortUserNewByDateOption options);
        Task<NumberUserActive> GetUserActiveAsync();
        // Tang truong doanh nghiep
        Task<List<(DateTime Period, int Count)>> GetBusinessRegistrationGrowthAsync (DateTime fromDate, DateTime toDate, GroupByOption groypBy);
        Task<int> GetTotalBusinessAccountsAsync();
        // Doanh thu
        Task<List<(DateTime Period, decimal Revenue)>> GetRevenueByPeriodAsync(DateTime fromDate, DateTime toDate, GroupByOption groupBy);
        Task<decimal> GetTotalRevenueAsync();
        // Tang truong bai dang
        Task<List<(DateTime Period, int Count)>> GetPostGrowthByPeriodAsync(DateTime fromDate, DateTime toDate, GroupByOption groupBy);
        Task<int> GetTotalPostsAsync();
        //// Top keywords
        Task<List<(string Keyword, int SearchCount)>> GetTopKeywordsAsync(int topN, DateTime? fromDate, DateTime? toDate);
        Task<int> GetTotalSearchesAsync(DateTime? fromDate, DateTime? toDate);
        //// Top bai viet duoc tuong tac nhieu nhat
        Task<List<TopEngagedPostResult>> GetTopEngagedPostsAsync(int topN, DateTime? fromDate, DateTime? toDate);
        ////Tong quan
        Task<int> GetTotalUsersAsync();

    }
}
