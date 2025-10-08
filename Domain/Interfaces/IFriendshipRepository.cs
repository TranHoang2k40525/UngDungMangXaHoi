using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IFriendshipRepository
    {
        Task<Friendship?> GetByIdAsync(Guid id);
        Task<Friendship?> GetFriendshipAsync(Guid requesterId, Guid addresseeId);
        Task<IEnumerable<User>> GetAcceptedFriendsAsync(Guid userId);
        Task<IEnumerable<User>> GetPendingFriendRequestsAsync(Guid userId);
        Task<IEnumerable<User>> GetSentFriendRequestsAsync(Guid userId);
        Task<Friendship> AddAsync(Friendship friendship);
        Task UpdateAsync(Friendship friendship);
        Task DeleteAsync(Guid id);
        Task<bool> ExistsAsync(Guid requesterId, Guid addresseeId);
        Task<bool> AreFriendsAsync(Guid userId1, Guid userId2);
        Task<int> GetFriendsCountAsync(Guid userId);
    }
}

