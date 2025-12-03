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


            return  new NumberUserActive
            {
                Count = numberData
            }; 
        }
    }
}