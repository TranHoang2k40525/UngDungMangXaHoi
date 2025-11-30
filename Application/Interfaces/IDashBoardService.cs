using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
namespace UngDungMangXaHoi.Application.Interfaces
{
    public interface IDashBoardService
    {
        Task<List<UserNewByDateDto>> GetUserNewDate(DateTime fromDate, DateTime toDate, SortUserNewByDateOptionDto option);  
            }
}
