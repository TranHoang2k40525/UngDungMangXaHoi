using System.Collections.Generic;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Domain.Interfaces
{
    public interface IReactionRepository
    {
        Task<Reaction?> GetByPostAndUserAsync(int postId, int userId);
        Task<List<Reaction>> GetByPostIdAsync(int postId);
        Task<Dictionary<ReactionType, int>> GetReactionCountsByPostIdAsync(int postId);
        Task<Reaction> AddAsync(Reaction reaction);
        Task<Reaction> UpdateAsync(Reaction reaction);
        Task DeleteAsync(Reaction reaction);
        Task<bool> ExistsAsync(int postId, int userId);
    }
}
