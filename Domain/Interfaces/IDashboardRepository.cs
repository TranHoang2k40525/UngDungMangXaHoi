using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Domain.Interfaces
{
   public interface IDashboardRepository
    {
        Task<List<UserNewByDateResult>> GetUserNewAsync(DateTime fromDate, DateTime toDate, SortUserNewByDateOption options);
        Task<NumberUserActive> GetUserActiveAsync();
    }
}
