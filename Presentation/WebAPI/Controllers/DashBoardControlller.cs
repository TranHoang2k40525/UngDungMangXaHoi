using UngDungMangXaHoi.WebAPI.Controllers;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Application.DTOs;
using Microsoft.AspNetCore.Http;
using UngDungMangXaHoi.Application.Services;
using UngDungMangXaHoi.Application.Interfaces;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    [Route("api/DashBoard")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class DashBoardController : ControllerBase
    {
        
        private readonly IDashBoardService _dashBoardService;
        public DashBoardController(IDashBoardService dashBoardService) {
        
        _dashBoardService = dashBoardService;
        }
        [Authorize]
        [HttpGet("new-user-stats")]
        public async Task<IActionResult> GetUserNewStats([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, [FromQuery] SortUserNewByDateOptionDto options)
        {
            try
            {
                if(fromDate > toDate)
                {
                    return BadRequest("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
                }
                var result = await _dashBoardService.GetUserNewDate(fromDate, toDate, options);
                return Ok(result);
            }
            catch (Exception ex) {
                return StatusCode(500, $"Loi server: {ex.Message}");
            }
        }


    }
}
