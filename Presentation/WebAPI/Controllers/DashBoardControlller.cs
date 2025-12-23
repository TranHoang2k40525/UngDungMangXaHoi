using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Interfaces;
using UngDungMangXaHoi.Application.Services;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.WebAPI.Controllers;
using static Microsoft.Extensions.Logging.EventSource.LoggingEventSource;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    [Route("api/DashBoard")]
    [ApiController]
    //[Authorize(Roles = "AdminOnly")]
    public class DashBoardController : ControllerBase
    {
        
        private readonly IDashBoardService _dashBoardService;
        private readonly ILogger<DashBoardController> _logger;

        public DashBoardController(IDashBoardService dashBoardService, ILogger<DashBoardController> logger) {
        
        _dashBoardService = dashBoardService;
            _logger = logger;
        }
        /// GET /api/admin/dashboard/summary
        /// Lấy toàn bộ dữ liệu dashboard (tổng hợp)
        [HttpGet("summary")]
        public async Task<IActionResult> GetDashboardSummary(
             [FromQuery] DateTime? startDate,
             [FromQuery] DateTime? endDate,
             [FromQuery] GroupByOptionDto chartGroupBy = GroupByOptionDto.Day)
        {
            try
            {
                var start = startDate ?? DateTime.UtcNow.AddDays(-30);
                var end = endDate ?? DateTime.UtcNow;

                _logger.LogInformation("Admin đang lấy dashboard summary từ {StartDate} đến {EndDate}, groupBy={GroupBy}",
                    start, end, chartGroupBy);

                var summary = await _dashBoardService.GetDashboardSummaryAsync(start, end, chartGroupBy);

                return Ok(new
                {
                    success = true,
                    message = "Lấy dữ liệu dashboard thành công",
                    data = summary
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning("Tham số không hợp lệ: {Message}", ex.Message);
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy dashboard summary");
                return StatusCode(500, new { success = false, message = $"Lỗi hệ thống: {ex.Message}" });
            }
        }
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
        [HttpGet("activeUser")]
        public async Task<IActionResult> GetActiveUser()
        {
            var result = await _dashBoardService.GetUserActive();
            return Ok(result);
        }
        /// Lấy biểu đồ tăng trưởng Business
        [HttpGet("business-growth-chart")]
        public async Task<IActionResult> GetBusinessGrowthChart([FromQuery] DateTime startDate, [FromQuery] DateTime endDate, [FromQuery] GroupByOptionDto group)
        {
            var result = await _dashBoardService.GetBusinessGrowthChartAsync(startDate, endDate, group);
            return Ok(result);
        }

        /// Lấy biểu đồ doanh thu
        [HttpGet("revenue-chart")]
        public async Task<IActionResult> GetRevenueChart([FromQuery] DateTime startDate, [FromQuery] DateTime endDate, [FromQuery] GroupByOptionDto group)
        {
            try 
            {
                _logger.LogInformation("Admin đang lấy revenue từ {StartDate} đến {EndDate}", startDate, endDate);

                var result = await _dashBoardService.GetRevenueChartAsync(startDate, endDate, group);
                return Ok(result);

            } catch (Exception ex) {
                return StatusCode(500, $"Loi server: {ex.Message}");
            }
            
        }
        /// Lấy biểu đồ tăng trưởng bài đăng

        [HttpGet("post-growth-chart")]
        public async Task<IActionResult> GetPostGrowthChart([FromQuery] DateTime startDate, [FromQuery] DateTime endDate, [FromQuery] GroupByOptionDto group)
        {
            try 
            {
                _logger.LogInformation("Admin đang lấy post growth từ {StartDate} đến {EndDate}", startDate, endDate);
                var result = await _dashBoardService.GetPostGrowthChartAsync(startDate, endDate, group);
                return Ok(result);
            } catch (Exception ex) {
                return (StatusCode(500, $"Loi server: {ex.Message}"));
            }
        }
        /// Lấy top từ khóa tìm kiếm nhiều nhất
        [HttpGet("keyword-top")]
        public async Task<IActionResult> GetTopKeywords([FromQuery] int topN, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                _logger.LogInformation("Admin đang lấy top {TopN} keywords", topN);

                var result = await _dashBoardService.GetTopKeywordsAsync(topN, startDate, endDate);
                return Ok(new
                {
                    success = true,
                    message = $"Lấy top {topN} từ khóa thành công",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning("Tham số không hợp lệ: {Message}", ex.Message);
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy top keywords");
                return StatusCode(500, new { success = false, message = $"Lỗi hệ thống: {ex.Message}" });
            }
        }
        /// Lấy top bài đăng tương tác cao nhất

        [HttpGet("posts-top")]
        public async Task<IActionResult> GetTopEngagedPosts([FromQuery] int topN = 10, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null) {
            try
            {
                _logger.LogInformation("Admin đang lấy top {TopN} engaged posts", topN);

                var posts = await _dashBoardService.GetTopEngagedPostsAsync(topN, startDate, endDate);

                // Build absolute URLs for avatars and media so frontend can render thumbnails directly
                try
                {
                    var baseUrl = $"{Request.Scheme}://{Request.Host.Value}";
                    if (posts?.Posts != null)
                    {
                        foreach (var p in posts.Posts)
                        {
                            // Normalize avatar URL
                            if (!string.IsNullOrEmpty(p.Author?.AvatarUrl) && !p.Author.AvatarUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                            {
                                p.Author.AvatarUrl = $"{baseUrl}/Assets/Images/{p.Author.AvatarUrl}";
                            }

                            // Normalize media URLs
                            if (p.Media != null)
                            {
                                foreach (var m in p.Media)
                                {
                                    if (!string.IsNullOrEmpty(m.MediaUrl) && !m.MediaUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                                    {
                                        var folder = (m.MediaType ?? "").ToLower().StartsWith("video") ? "Videos" : "Images";
                                        m.MediaUrl = $"{baseUrl}/Assets/{folder}/{m.MediaUrl}";
                                    }
                                }
                            }
                        }
                    }
                }
                catch { /* best-effort; don't fail the request if URL build fails */ }

                return Ok(new
                {
                    success = true,
                    message = $"Lấy top {topN} bài đăng thành công",
                    data = posts
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning("Tham số không hợp lệ: {Message}", ex.Message);
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy top posts");
                return StatusCode(500, new { success = false, message = $"Lỗi hệ thống: {ex.Message}" });
            }
        }
    }
}
