using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.Services;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    /// <summary>
    /// Controller xử lý tìm kiếm users và posts
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SearchController : ControllerBase
    {
        private readonly SearchService _searchService;

        public SearchController(SearchService searchService)
        {
            _searchService = searchService;
        }

        /// <summary>
        /// Lấy userId từ JWT token
        /// </summary>
        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out var userId))
                return userId;
            return null;
        }

        /// <summary>
        /// Tìm kiếm users
        /// GET: api/search/users?q=quan&page=1&pageSize=20
        /// Hỗ trợ tìm kiếm với @ (ví dụ: @quan)
        /// </summary>
        [HttpGet("users")]
        public async Task<IActionResult> SearchUsers(
            [FromQuery] string q,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(q))
                {
                    return Ok(new
                    {
                        message = "Vui lòng nhập từ khóa tìm kiếm",
                        data = new { Results = new object[] { }, TotalCount = 0, PageNumber = page, PageSize = pageSize }
                    });
                }

                var currentUserId = GetCurrentUserId();
                var result = await _searchService.SearchUsersAsync(q, currentUserId, page, pageSize);

                return Ok(new
                {
                    message = "Tìm kiếm thành công",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Lỗi khi tìm kiếm users",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Tìm kiếm posts theo caption/hashtags
        /// GET: api/search/posts?q=travel&page=1&pageSize=20
        /// Hỗ trợ tìm kiếm với # (ví dụ: #travel)
        /// </summary>
        [HttpGet("posts")]
        public async Task<IActionResult> SearchPosts(
            [FromQuery] string q,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(q))
                {
                    return Ok(new
                    {
                        message = "Vui lòng nhập từ khóa tìm kiếm",
                        data = new { Results = new object[] { }, TotalCount = 0, PageNumber = page, PageSize = pageSize }
                    });
                }

                var currentUserId = GetCurrentUserId();
                var result = await _searchService.SearchPostsAsync(q, currentUserId, page, pageSize);

                return Ok(new
                {
                    message = "Tìm kiếm thành công",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Lỗi khi tìm kiếm posts",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Tìm kiếm tổng hợp cả users và posts
        /// GET: api/search/all?q=keyword
        /// </summary>
        [HttpGet("all")]
        public async Task<IActionResult> SearchAll([FromQuery] string q)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(q))
                {
                    return Ok(new
                    {
                        message = "Vui lòng nhập từ khóa tìm kiếm",
                        data = new { Users = new object[] { }, Posts = new object[] { }, TotalUsersCount = 0, TotalPostsCount = 0 }
                    });
                }

                var currentUserId = GetCurrentUserId();
                var result = await _searchService.SearchAllAsync(q, currentUserId);

                return Ok(new
                {
                    message = "Tìm kiếm thành công",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Lỗi khi tìm kiếm",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Gợi ý tìm kiếm (trending hashtags, popular users)
        /// GET: api/search/suggestions
        /// </summary>
        [HttpGet("suggestions")]
        public async Task<IActionResult> GetSuggestions()
        {
            try
            {
                // TODO: Implement suggestions logic
                // Có thể cache các hashtag phổ biến, user có nhiều followers, etc.
                
                return Ok(new
                {
                    message = "Lấy gợi ý thành công",
                    data = new
                    {
                        TrendingHashtags = new[] { "#travel", "#food", "#photography", "#nature", "#vietnam" },
                        PopularUsers = new object[] { }
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Lỗi khi lấy gợi ý",
                    error = ex.Message
                });
            }
        }
    }
}
