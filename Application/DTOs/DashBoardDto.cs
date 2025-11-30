using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class UserNewByDateDto 
    {
        public string? DisplayTime { get; set; }
        public double Count { get; set; }
    }
    public enum SortUserNewByDateOptionDto
    {
        Day,
        Week,
        Month
    }
}
