using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces;

public interface IReportRepository
{
    Task<Report?> GetByIdAsync(int reportId);
    Task<(List<Report> Reports, int TotalCount)> GetReportsAsync(string status, int page, int pageSize);
    Task<Report> CreateAsync(Report report);
    Task<Report> UpdateAsync(Report report);
    Task<bool> DeleteAsync(int reportId);
    Task<int> GetReportCountByUserAsync(int userId, DateTime? fromDate = null);
}
