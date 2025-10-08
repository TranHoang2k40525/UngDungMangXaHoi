using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using UngDungMangXaHoi.Application.UseCases.Users;
using UngDungMangXaHoi.Domain.DTOs;
using UngDungMangXaHoi.Application.Validators;
using System.Security.Claims;

namespace UngDungMangXaHoi.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly RegisterUser _registerUser;
        private readonly LoginUser _loginUser;
        private readonly UpdateProfile _updateProfile;

        public UserController(RegisterUser registerUser, LoginUser loginUser, UpdateProfile updateProfile)
        {
            _registerUser = registerUser;
            _loginUser = loginUser;
            _updateProfile = updateProfile;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserCreateDto userCreateDto)
        {
            try
            {
                // Validate input
                var validationResult = UserValidator.ValidateUserCreate(userCreateDto);
                if (!validationResult.IsValid)
                {
                    return BadRequest(new { message = validationResult.GetErrorMessage() });
                }

                var user = await _registerUser.ExecuteAsync(userCreateDto);
                return CreatedAtAction(nameof(GetProfile), new { id = user.Id }, user);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while registering the user" });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginDto userLoginDto)
        {
            try
            {
                // Validate input
                var validationResult = UserValidator.ValidateUserLogin(userLoginDto);
                if (!validationResult.IsValid)
                {
                    return BadRequest(new { message = validationResult.GetErrorMessage() });
                }

                var result = await _loginUser.ExecuteAsync(userLoginDto);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while logging in" });
            }
        }

        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == null)
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                // TODO: Implement GetProfile use case
                return Ok(new { message = "Profile endpoint not implemented yet" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while getting profile" });
            }
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UserUpdateDto userUpdateDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == null)
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                // Validate input
                var validationResult = UserValidator.ValidateUserUpdate(userUpdateDto);
                if (!validationResult.IsValid)
                {
                    return BadRequest(new { message = validationResult.GetErrorMessage() });
                }

                var user = await _updateProfile.ExecuteAsync(userId.Value, userUpdateDto);
                return Ok(user);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while updating profile" });
            }
        }

        private Guid? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out Guid userId))
            {
                return userId;
            }
            return null;
        }
    }
}

