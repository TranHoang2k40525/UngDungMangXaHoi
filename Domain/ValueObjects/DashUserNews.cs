using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Domain.ValueObjects
{
    public class UserNewByDateResult
    {
        public DateTime TimeLabel { get; set; }
        public double Count { get; set; }
    }
    public enum SortUserNewByDateOption
    {
        Day,
        Week,
        Month
    }
   
}
