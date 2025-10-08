using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class FriendshipRepository : IFriendshipRepository
    {
        private readonly AppDbContext _context;

        public FriendshipRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Friendship?> GetByIdAsync(Guid id)
        {
            return await _context.Friendships
                .Include(f => f.Requester)
                .Include(f => f.Addressee)
                .FirstOrDefaultAsync(f => f.Id == id);
        }

        public async Task<Friendship?> GetFriendshipAsync(Guid requesterId, Guid addresseeId)
        {
            return await _context.Friendships
                .Include(f => f.Requester)
                .Include(f => f.Addressee)
                .FirstOrDefaultAsync(f => 
                    (f.RequesterId == requesterId && f.AddresseeId == addresseeId) ||
                    (f.RequesterId == addresseeId && f.AddresseeId == requesterId));
        }

        public async Task<IEnumerable<User>> GetAcceptedFriendsAsync(Guid userId)
        {
            var friendships = await _context.Friendships
                .Include(f => f.Requester)
                .Include(f => f.Addressee)
                .Where(f => (f.RequesterId == userId || f.AddresseeId == userId) && 
                           f.Status == FriendshipStatus.Accepted)
                .ToListAsync();

            return friendships.Select(f => f.RequesterId == userId ? f.Addressee : f.Requester);
        }

        public async Task<IEnumerable<User>> GetPendingFriendRequestsAsync(Guid userId)
        {
            var friendships = await _context.Friendships
                .Include(f => f.Requester)
                .Where(f => f.AddresseeId == userId && f.Status == FriendshipStatus.Pending)
                .ToListAsync();

            return friendships.Select(f => f.Requester);
        }

        public async Task<IEnumerable<User>> GetSentFriendRequestsAsync(Guid userId)
        {
            var friendships = await _context.Friendships
                .Include(f => f.Addressee)
                .Where(f => f.RequesterId == userId && f.Status == FriendshipStatus.Pending)
                .ToListAsync();

            return friendships.Select(f => f.Addressee);
        }

        public async Task<Friendship> AddAsync(Friendship friendship)
        {
            _context.Friendships.Add(friendship);
            await _context.SaveChangesAsync();
            return friendship;
        }

        public async Task UpdateAsync(Friendship friendship)
        {
            _context.Friendships.Update(friendship);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var friendship = await _context.Friendships.FindAsync(id);
            if (friendship != null)
            {
                _context.Friendships.Remove(friendship);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> ExistsAsync(Guid requesterId, Guid addresseeId)
        {
            return await _context.Friendships.AnyAsync(f => 
                (f.RequesterId == requesterId && f.AddresseeId == addresseeId) ||
                (f.RequesterId == addresseeId && f.AddresseeId == requesterId));
        }

        public async Task<bool> AreFriendsAsync(Guid userId1, Guid userId2)
        {
            return await _context.Friendships.AnyAsync(f => 
                ((f.RequesterId == userId1 && f.AddresseeId == userId2) ||
                 (f.RequesterId == userId2 && f.AddresseeId == userId1)) &&
                f.Status == FriendshipStatus.Accepted);
        }

        public async Task<int> GetFriendsCountAsync(Guid userId)
        {
            return await _context.Friendships.CountAsync(f => 
                (f.RequesterId == userId || f.AddresseeId == userId) && 
                f.Status == FriendshipStatus.Accepted);
        }
    }
}

