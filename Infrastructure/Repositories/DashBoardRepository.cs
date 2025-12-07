using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq; // Dùng cho LINQ in Memory
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Infrastructure.Persistence;


namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class DashBoardRepository : IDashboardRepository
    {
        private readonly AppDbContext _context;
        public DashBoardRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<UserNewByDateResult>> GetUserNewAsync(DateTime fromDate, DateTime toDate, SortUserNewByDateOption options)
        {
            // BƯỚC 1: Lấy dữ liệu thô từ Database (Server-side evaluation)
            // Chỉ lấy cột created_at để nhẹ gánh cho đường truyền
            var rawData = await _context.Accounts
                .Where(a => a.account_type == AccountType.User &&
                            a.created_at >= fromDate &&
                            a.created_at <= toDate)
                .Select(a => a.created_at) // Chỉ lấy cột ngày tạo
                .ToListAsync(); // <--- CHỐT ĐƠN: Lấy dữ liệu về RAM tại đây

            // BƯỚC 2: Xử lý GroupBy trên RAM (Client-side evaluation)
            // Lúc này dữ liệu đã là List<DateTimeOffset> trên bộ nhớ, dùng C# thoải mái

            IEnumerable<UserNewByDateResult> resultQuery;

            switch (options)
            {
                case SortUserNewByDateOption.Day:
                    resultQuery = rawData
                        .GroupBy(d => d.Date)
                        .Select(g => new UserNewByDateResult
                        {
                            TimeLabel = g.Key,
                            Count = g.Count()
                        });
                    break;

                case SortUserNewByDateOption.Week:
                    // Logic tính ngày đầu tuần (Chủ nhật)
                    // C# xử lý cái này cực mượt, không bị lỗi SQL nữa
                    resultQuery = rawData
                        .GroupBy(d => d.Date.AddDays(-(int)d.DayOfWeek))
                        .Select(g => new UserNewByDateResult
                        {
                            TimeLabel = g.Key,
                            Count = g.Count()
                        });
                    break;

                case SortUserNewByDateOption.Month:
                    resultQuery = rawData
                        .GroupBy(d => new { d.Year, d.Month })
                        .Select(g => new UserNewByDateResult
                        {
                            TimeLabel = new DateTime(g.Key.Year, g.Key.Month, 1),
                            Count = g.Count()
                        });
                    break;

                default:
                    return new List<UserNewByDateResult>();
            }

            // BƯỚC 3: Sắp xếp và trả về
            return resultQuery
                .OrderBy(x => x.TimeLabel)
                .ToList();
        }
        public async Task<NumberUserActive> GetUserActiveAsync()

        {
            var numberData = await _context.Accounts.CountAsync(a => a.account_type == AccountType.User &&
                            a.status == "active");


            return new NumberUserActive
            {
                Count = numberData
            };
        }
        // Tang truong doanh nghiep
        public async Task<List<(DateTime Period, int Count)>> GetBusinessRegistrationGrowthAsync(DateTime fromDate, DateTime toDate, GroupByOption groypBy)
        {
            var query = _context.Accounts.AsNoTracking().Where(a => a.account_type == AccountType.Business && a.business_verified_at != null && a.business_verified_at >= fromDate && a.business_verified_at <= toDate);

            IEnumerable<(DateTime Period, int Count)> resultQuery;
            switch (groypBy)
            {
                case GroupByOption.Day:
                    var rawDay = await query.GroupBy(a => a.business_verified_at!.Value.Date).Select(g => new { Period = g.Key, Count = g.Count() }).OrderBy(g => g.Period).ToListAsync();
                    resultQuery = rawDay.Select(r => (r.Period, r.Count));
                    break;
                case GroupByOption.Week:
                    var dates = await query.Select(q => q.business_verified_at!.Value.Date).ToListAsync();
                    var rawWeek = dates.GroupBy(d => d.AddDays(-(int)d.DayOfWeek)).Select(g => new { Period = g.Key, Count = g.Count() }).OrderBy(g => g.Period).ToList();
                    resultQuery = rawWeek.Select(r => (r.Period, r.Count));
                    break;
                case GroupByOption.Month:
                    var rawMonth = await query.GroupBy(a => new { a.business_verified_at!.Value.Year, a.business_verified_at!.Value.Month }).Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Count = g.Count() }).OrderBy(g => g.Year).ThenBy(g => g.Month).ToListAsync();
                    resultQuery = rawMonth.Select(r => (new DateTime(r.Year, r.Month, 1), r.Count));
                    break;
                case GroupByOption.Year:
                    var rawYear = await query.GroupBy(a => a.business_verified_at!.Value.Year).Select(g => new { Year = g.Key, Count = g.Count() }).OrderBy(x => x.Year).ToListAsync();
                    resultQuery = rawYear.Select(r => (new DateTime(r.Year, 1, 1), r.Count));
                    break;
                default:
                    return new List<(DateTime Period, int Count)>();
            }
            return resultQuery.ToList();
        }
        public async Task<int> GetTotalBusinessAccountsAsync()
        {
            return await _context.Accounts.AsNoTracking().CountAsync(a => a.account_type == AccountType.Business && a.business_verified_at != null && a.status == "active");
        }
        // Doanh thu
        public async Task<List<(DateTime Period, decimal Revenue)>> GetRevenueByPeriodAsync(DateTime fromDate, DateTime toDate, GroupByOption groupBy)
        {
            var query = _context.BusinessPayments.AsNoTracking().Where(p =>p.Status == PaymentStatus.Completed && p.PaidAt != null && p.PaidAt >= fromDate && p.PaidAt <= toDate);
            IEnumerable<(DateTime Period, decimal Revenue)> resultQuery;
            switch (groupBy)
            {
                case GroupByOption.Day:
                    var rawDay = await query.GroupBy(p => p.PaidAt!.Value.Date).Select(g => new { Period = g.Key, Revenue = g.Sum(p => p.Amount) }).OrderBy(g => g.Period).ToListAsync();
                    resultQuery = rawDay.Select(r => (r.Period, r.Revenue));
                    break;
                case GroupByOption.Week:
                    var date = await query.Select(p=> new {Date = p.PaidAt!.Value.Date, Amount = p.Amount}).ToListAsync();
                    var rawWeek = date.GroupBy(d => d.Date.AddDays(-(int)d.Date.DayOfWeek)).Select(g => new { Period = g.Key, Revenue = g.Sum(p => p.Amount) }).OrderBy(g => g.Period).ToList();
                    resultQuery = rawWeek.Select(r => (r.Period, r.Revenue));
                    break;
                case GroupByOption.Month:
                    var rawMonth = await query.GroupBy(p => new { p.PaidAt!.Value.Year, p.PaidAt!.Value.Month }).Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Revenue = g.Sum(p => p.Amount) }).OrderBy(g => g.Year).ThenBy(g => g.Month).ToListAsync();
                    resultQuery = rawMonth.Select(r => (new DateTime(r.Year, r.Month, 1), r.Revenue));
                    break;
                case GroupByOption.Year:
                    var rawYear = await query.GroupBy(p => p.PaidAt!.Value.Year).Select(g => new { Year = g.Key, Revenue = g.Sum(p => p.Amount) }).OrderBy(x => x.Year).ToListAsync();
                    resultQuery = rawYear.Select(r => (new DateTime(r.Year, 1, 1), r.Revenue));
                    break;
                default:
                    return new List<(DateTime Period, decimal Revenue)>();
                    
            }
            return resultQuery.ToList();
        }
       public async Task<decimal> GetTotalRevenueAsync()
        {
            return await _context.BusinessPayments.AsNoTracking().Where(b => b.Status == PaymentStatus.Completed).SumAsync(b => b.Amount);
        }
        // Tang truong bai dang
        public async Task<List<(DateTime Period, int Count)>> GetPostGrowthByPeriodAsync(DateTime fromDate, DateTime toDate, GroupByOption groupBy)
        {
            var query = _context.Posts.AsNoTracking().Where(p => p.is_visible && p.created_at >= fromDate && p.created_at <= toDate);
            IEnumerable<(DateTime Period, int Count)> resultQuery;
            switch (groupBy)
            { case GroupByOption.Day:
                    var rawDay = await query.GroupBy(p => p.created_at.Date).Select(g => new { Period = g.Key, Count = g.Count() }).OrderBy(g => g.Period).ToListAsync();
                    resultQuery = rawDay.Select(r => (r.Period, r.Count));
                    break;
                case GroupByOption.Week:
                    var dates = await query.Select(q => q.created_at.Date).ToListAsync();
                    var rawWeek = dates.GroupBy(d => d.AddDays(-(int)d.DayOfWeek)).Select(g => new { Period = g.Key, Count = g.Count() }).OrderBy(g => g.Period).ToList();
                    resultQuery = rawWeek.Select(r => (r.Period, r.Count));
                    break;
                case GroupByOption.Month:
                    var rawMonth = await query.GroupBy(p => new { p.created_at.Year, p.created_at.Month }).Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Count = g.Count() }).OrderBy(g => g.Year).ThenBy(g => g.Month).ToListAsync();
                    resultQuery = rawMonth.Select(r => (new DateTime(r.Year, r.Month, 1), r.Count));
                    break;
                case GroupByOption.Year:
                    var rawYear = await query.GroupBy(p => p.created_at.Year).Select(g => new { Year = g.Key, Count = g.Count() }).OrderBy(x => x.Year).ToListAsync();
                    resultQuery = rawYear.Select(r => (new DateTime(r.Year, 1, 1), r.Count));
                    break;
                default:
                    return new List<(DateTime Period, int Count)>();


            }
            return resultQuery.ToList();

        }
        public async Task<int> GetTotalPostsAsync()
        {
            return await _context.Posts.AsNoTracking().CountAsync(p => p.is_visible);
        }
        public async Task<List<(string Keyword, int SearchCount)>> GetTopKeywordsAsync(int topN, DateTime? fromDate, DateTime? toDate)
        {
            var query = _context.Set<SearchHistory>().AsNoTracking().Where(s=> !string.IsNullOrEmpty(s.keyword));
            if(fromDate.HasValue)
            {
                query = query.Where(s => s.searched_at >= fromDate.Value);
            }
            if(toDate.HasValue)
            {
                query = query.Where(s => s.searched_at <= toDate.Value);
            }
            var result =  await query.GroupBy(s => s.keyword!.ToLower()).Select(sh => new
            {
                Keyword = sh.Key,
                SearchCount = sh.Count()
            }).OrderByDescending(x => x.SearchCount).Take(topN).ToListAsync();
            return result.Select(x => (x.Keyword, x.SearchCount)).ToList();
        }
        public async Task<int> GetTotalSearchesAsync(DateTime? fromDate, DateTime? toDate)
        {
            var data = _context.Set<SearchHistory>().AsQueryable();
            if (fromDate.HasValue)
            {
                data = data.Where(sh => sh.searched_at >= fromDate.Value);
            }
            if (toDate.HasValue)
            {
                data = data.Where(sh => sh.searched_at >= toDate);
            }
            return await data.CountAsync();
        }
        //// Top bai viet duoc tuong tac nhieu nhat

        public async Task<List<TopEngagedPostResult>> GetTopEngagedPostsAsync(int topN, DateTime? fromDate, DateTime? toDate)
        {
            var postQuery = _context.Posts.AsNoTracking().Include(p => p.User).ThenInclude(p => p.Account).Include(p => p.Media).Where(p => p.is_visible);
            if (fromDate.HasValue)
            {
                postQuery = postQuery.Where(p => p.created_at >= fromDate.Value);
            }
            if (toDate.HasValue)
            {
                postQuery = postQuery.Where(p => p.created_at <= toDate.Value);
            }
            // lay danh sach  postId
            var postIds =await postQuery.Select(p => p.post_id).ToListAsync();
            // dem reaction 
            var reactionCounts = await _context.Reactions.Where(r => postIds.Contains(r.post_id)).GroupBy(r => r.post_id).Select(g => new
            {
                PostId = g.Key,
                Count = g.Count()
            }).ToDictionaryAsync(x => x.PostId, x => x.Count);
            //Dem comment
            var commentCounts = await _context.Comments.Where(c => postIds.Contains(c.PostId) && !c.IsVisible).GroupBy(c => c.PostId).Select(c => new { PostId = c.Key, Count = c.Count() }).ToDictionaryAsync(c => c.PostId, c => c.Count);
            var topPostIds = postIds
        .Select(id => new
        {
            PostId = id,
            TotalScore = reactionCounts.GetValueOrDefault(id, 0) +
                         commentCounts.GetValueOrDefault(id, 0)
        })
        .OrderByDescending(x => x.TotalScore)
        .Take(topN) // Chỉ lấy Top N cái ID cao điểm nhất
        .Select(x => x.PostId)
        .ToList();

            var topPosts = await _context.Posts
        .AsNoTracking()
        .Include(p => p.User).ThenInclude(u => u.Account)
        .Include(p => p.Media)
        .Where(p => topPostIds.Contains(p.post_id))
        .ToListAsync();
            // tao ket qua
            var result = topPosts.Select(r => new TopEngagedPostResult
            {
                PostId = r.post_id,
                Caption = r.caption ?? string.Empty,
                CreatedAt = r.created_at.DateTime,
                UserId = r.User.user_id,
                Username = r.User.username.Value,
                FullName = r.User.full_name,
                AvatarUrl = r.User.avatar_url?.Value,
                AccountType = r.User.Account.account_type.ToString(),

                ReactionCount = reactionCounts.GetValueOrDefault(r.post_id, 0),
                CommentCount = commentCounts.GetValueOrDefault(r.post_id, 0),
                Media = r.Media.OrderBy(m => m.media_order).Select(m => new PostMediaInfo
                {
                    MediaUrl = m.media_url,
                    MediaType = m.media_type,
                    MediaOrder = m.media_order
                }).ToList()

            }).ToList();
            return result;
        }
        public async Task<int> GetTotalUsersAsync()
        {
            var result = _context.Users.CountAsync();
            return await result;
        }
        // Helper method
        private DateTime GetStartOfWeek(DateTime date)
        {
            int diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
            return date.AddDays(-1 * diff).Date;
        }


    }

}