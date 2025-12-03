using Microsoft.Extensions.Options;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Interfaces;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;


namespace UngDungMangXaHoi.Application.Services
{
    public class DashBoardService : IDashBoardService
    {
        private readonly IDashboardRepository _dashboardRepository;
        public DashBoardService(IDashboardRepository dashboardRepository)
        {
            _dashboardRepository = dashboardRepository;
        }
        public async Task<List<UserNewByDateDto>> GetUserNewDate (DateTime fromDate, DateTime toDate, SortUserNewByDateOptionDto option)
        {
            var domainOption = (SortUserNewByDateOption)option;
            var context = await _dashboardRepository.GetUserNewAsync(fromDate, toDate, domainOption);
            var resultDto = context.Select(c => new UserNewByDateDto
            {
                DisplayTime = option == SortUserNewByDateOptionDto.Month
                  ? c.TimeLabel.ToString("MM/yyyy")     // Nếu chọn Tháng -> Hiện 11/2025
                  : c.TimeLabel.ToString("dd/MM/yyyy"), // Còn lại -> Hiện 30/11/2025
                Count = c.Count
            }).ToList();
            return resultDto;

        }
        public async Task<NumberUserActiveDto> GetUserActive()
        {
            var context = await _dashboardRepository.GetUserActiveAsync();
            var resultDto = new NumberUserActiveDto
            {
                Count = context.Count
            };
            return resultDto;
        }
    }
}
