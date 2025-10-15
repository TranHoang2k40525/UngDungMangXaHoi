using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    /// <summary>
    /// UserController - Reserved for future user-related endpoints
    /// Profile management has been moved to ProfileController
    /// </summary>
    [ApiController]
    [Route("api/users")]
    [Authorize(Policy = "UserOnly")]
    public class UserController : ControllerBase
    {
        private readonly IUserRepository _userRepository;

        public UserController(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        // GetProfile method removed - use ProfileController.GetProfile instead
        // Endpoint: GET /api/users/profile is now handled by ProfileController
    }
}