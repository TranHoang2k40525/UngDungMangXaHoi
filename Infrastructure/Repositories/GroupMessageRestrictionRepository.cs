using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class GroupMessageRestrictionRepository : IGroupMessageRestrictionRepository
    {
        private readonly AppDbContext _context;

        public GroupMessageRestrictionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> IsRestrictedAsync(int restrictingUserId, int restrictedUserId)
        {
            return await _context.MessageRestrictions
                .AnyAsync(mr => mr.restricting_user_id == restrictingUserId 
                               && mr.restricted_user_id == restrictedUserId);
        }

        public async Task<bool> AreRestrictingEachOtherAsync(int userId1, int userId2)
        {
            return await _context.MessageRestrictions
                .AnyAsync(mr => (mr.restricting_user_id == userId1 && mr.restricted_user_id == userId2) ||
                               (mr.restricting_user_id == userId2 && mr.restricted_user_id == userId1));
        }

        public async Task<GroupMessageRestriction?> GetRestrictionAsync(int restrictingUserId, int restrictedUserId)
        {
            return await _context.MessageRestrictions
                .FirstOrDefaultAsync(mr => mr.restricting_user_id == restrictingUserId 
                                          && mr.restricted_user_id == restrictedUserId);
        }

        public async Task AddRestrictionAsync(GroupMessageRestriction restriction)
        {
            _context.MessageRestrictions.Add(restriction);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveRestrictionAsync(GroupMessageRestriction restriction)
        {
            _context.MessageRestrictions.Remove(restriction);
            await _context.SaveChangesAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
