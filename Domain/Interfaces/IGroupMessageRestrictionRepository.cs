using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IGroupMessageRestrictionRepository
    {
        /// <summary>
        /// Kiểm tra xem restrictedUserId có bị hạn chế tin nhắn bởi restrictingUserId không
        /// </summary>
        Task<bool> IsRestrictedAsync(int restrictingUserId, int restrictedUserId);
        
        /// <summary>
        /// Kiểm tra xem hai user có hạn chế tin nhắn nhau không (bất kỳ chiều nào)
        /// </summary>
        Task<bool> AreRestrictingEachOtherAsync(int userId1, int userId2);
        
    Task<GroupMessageRestriction?> GetRestrictionAsync(int restrictingUserId, int restrictedUserId);
    Task AddRestrictionAsync(GroupMessageRestriction restriction);
    Task RemoveRestrictionAsync(GroupMessageRestriction restriction);
        Task SaveChangesAsync();
    }
}
