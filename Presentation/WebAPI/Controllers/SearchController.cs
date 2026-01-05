using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.Services;
using UngDungMangXaHoi.Domain.Interfaces;

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
        private readonly ISearchHistoryRepository _searchHistoryRepository;
        private readonly IUserRepository _userRepository;

        public SearchController(
            SearchService searchService,
            ISearchHistoryRepository searchHistoryRepository,
            IUserRepository userRepository)
        {
            _searchService = searchService;
            _searchHistoryRepository = searchHistoryRepository;
            _userRepository = userRepository;
        }

        /// <summary>
        /// Lấy accountId từ JWT token
        /// </summary>
        private int? GetCurrentAccountId()
        {
            var accountIdClaim = User.FindFirst("AccountId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(accountIdClaim, out var accountId))
                return accountId;
            return null;
        }

        /// <summary>
        /// Convert accountId to userId
        /// </summary>
        private async Task<int?> GetCurrentUserIdAsync()
        {
            var accountId = GetCurrentAccountId();
            if (!accountId.HasValue) return null;
            
            var user = await _userRepository.GetByAccountIdAsync(accountId.Value);
            return user?.user_id;
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

                var currentUserId = await GetCurrentUserIdAsync();
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

                var currentUserId = await GetCurrentUserIdAsync();
                
                // Lưu lịch sử tìm kiếm
                if (currentUserId.HasValue)
                {
                    await _searchHistoryRepository.AddSearchHistoryAsync(currentUserId.Value, q);
                }
                
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

                var currentUserId = await GetCurrentUserIdAsync();
                
                // Lưu lịch sử tìm kiếm
                if (currentUserId.HasValue)
                {
                    await _searchHistoryRepository.AddSearchHistoryAsync(currentUserId.Value, q);
                }
                
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
