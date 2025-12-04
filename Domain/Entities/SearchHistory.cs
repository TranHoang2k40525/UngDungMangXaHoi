using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    /// <summary>
    /// Entity lưu lịch sử tìm kiếm của người dùng
    /// </summary>
    public class SearchHistory
    {
        public int id { get; set; }
        public int? user_id { get; set; }
        public string? keyword { get; set; }
        public DateTime? searched_at { get; set; }

        // Navigation property
        public virtual User? User { get; set; }
    }
}
