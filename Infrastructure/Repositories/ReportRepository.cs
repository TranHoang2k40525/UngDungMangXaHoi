using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories;

public class ReportRepository : IReportRepository
{
    private readonly AppDbContext _context;

    public ReportRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Report?> GetByIdAsync(int reportId)
    {
        return await _context.Reports
            .Include(r => r.Reporter)
            .Include(r => r.ReportedUser)
            .Include(r => r.ResolvedByAdmin)
            .FirstOrDefaultAsync(r => r.ReportId == reportId);
    }

    public async Task<(List<Report> Reports, int TotalCount)> GetReportsAsync(string status, int page, int pageSize)
    {
        var query = _context.Reports
            .Include(r => r.Reporter)
            .Include(r => r.ReportedUser)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && status != "all")
        {
            query = query.Where(r => r.Status == status);
        }

        var totalCount = await query.CountAsync();

        var reports = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (reports, totalCount);
    }

    public async Task<Report> CreateAsync(Report report)
    {
        report.CreatedAt = DateTimeOffset.UtcNow;
        _context.Reports.Add(report);
        await _context.SaveChangesAsync();
        return report;
    }

    public async Task<Report> UpdateAsync(Report report)
    {
        _context.Reports.Update(report);
        await _context.SaveChangesAsync();
        return report;
    }

    public async Task<bool> DeleteAsync(int reportId)
    {
        var report = await _context.Reports.FindAsync(reportId);
        if (report == null) return false;

        _context.Reports.Remove(report);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> GetReportCountByUserAsync(int userId, DateTime? fromDate = null)
    {
        var query = _context.Reports
            .Where(r => r.ReportedUserId == userId && r.Status == "resolved");

        if (fromDate.HasValue)
        {
            query = query.Where(r => r.CreatedAt >= fromDate.Value);
        }

        return await query.CountAsync();
    }
}
