using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Search users by username for @mention autocomplete
        /// </summary>
        [HttpGet("search")]
        public async Task<IActionResult> SearchUsers([FromQuery] string query, [FromQuery] int limit = 10)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
                {
                    return Ok(new
                    {
                        success = true,
                        users = new List<object>()
                    });
                }

                var users = await _context.Users
                    .Where(u => u.username.Value.ToLower().Contains(query.ToLower()))
                    .Take(limit)
                    .Select(u => new
                    {
                        userId = u.user_id,
                        username = u.username.Value,
                        fullName = u.full_name,
                        avatarUrl = u.avatar_url != null ? u.avatar_url.Value : null
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    users
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UsersController] Search error: {ex.Message}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi tìm kiếm users"
                });
            }
        }
    }
}
