using System.Collections.Generic;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    /// <summary>
    /// Repository interface cho SearchHistory operations
    /// </summary>
    public interface ISearchHistoryRepository
    {
        /// <summary>
        /// Thêm lịch sử tìm kiếm mới
        /// </summary>
        Task AddSearchHistoryAsync(int userId, string keyword);

        /// <summary>
        /// Lấy danh sách từ khóa tìm kiếm gần đây
        /// </summary>
        Task<List<string>> GetRecentSearchKeywordsAsync(int userId, int limit = 20);

        /// <summary>
        /// Lấy danh sách từ khóa tìm kiếm phổ biến nhất (theo tần suất)
        /// </summary>
        Task<List<string>> GetTopSearchKeywordsAsync(int userId, int limit = 10);
    }
}
