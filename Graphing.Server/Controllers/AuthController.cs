using Graphing.Server.Contracts;
using Graphing.Server.Data;
using Graphing.Server.Models;
using Graphing.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Graphing.Server.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _dbContext;
        private readonly JwtTokenService _tokenService;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            ApplicationDbContext dbContext,
            JwtTokenService tokenService)
        {
            _userManager = userManager;
            _dbContext = dbContext;
            _tokenService = tokenService;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
        {
            var trimmedEmail = request.Email.Trim();
            var trimmedName = request.Name.Trim();

            if (await _userManager.FindByEmailAsync(trimmedEmail) is not null)
            {
                return BadRequest(CreateValidationProblem(("Email", "An account with this email already exists.")));
            }

            if (await _dbContext.ApplicationUsers.AnyAsync(user => user.Name == trimmedName))
            {
                return BadRequest(CreateValidationProblem(("Name", "This name is already taken.")));
            }

            var user = new ApplicationUser
            {
                UserName = trimmedEmail,
                Email = trimmedEmail,
                Name = trimmedName,
                isBanned = false
            };

            var createResult = await _userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                return BadRequest(CreateValidationProblem(ToValidationProblemErrors(createResult)));
            }

            var (accessToken, expiresAtUtc) = await _tokenService.CreateTokenAsync(user);
            var userDto = await ToUserDtoAsync(user);
            return Ok(new AuthResponse(accessToken, userDto, expiresAtUtc));
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email.Trim());
            if (user is null)
            {
                return BadRequest(CreateValidationProblem(("Email", "No account exists with this email.")));
            }

            if (await IsUserBannedAsync(user))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "This account is banned." });
            }

            var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!passwordValid)
            {
                return BadRequest(CreateValidationProblem(("Password", "Incorrect password.")));
            }

            var (accessToken, expiresAtUtc) = await _tokenService.CreateTokenAsync(user);
            var userDto = await ToUserDtoAsync(user);
            return Ok(new AuthResponse(accessToken, userDto, expiresAtUtc));
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<ActionResult<AuthUserDto>> Me()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return Unauthorized();
            }

            if (await IsUserBannedAsync(user))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "This account is banned." });
            }

            var dto = await ToUserDtoAsync(user);
            return Ok(dto);
        }

        [Authorize]
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            return Ok(new AuthMessageResponse("Signed out."));
        }

        private async Task<bool> IsUserBannedAsync(ApplicationUser user)
        {
            if (user.isBanned)
            {
                return true;
            }

            return await _dbContext.Bans.AnyAsync(ban => ban.UserId == user.Id && ban.IsActive);
        }

        private async Task<AuthUserDto> ToUserDtoAsync(ApplicationUser user)
        {
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");
            return new AuthUserDto(user.Id, user.Email ?? string.Empty, user.Name, user.isBanned, isAdmin);
        }

        private static ValidationProblemDetails CreateValidationProblem(params (string Field, string Message)[] errors)
        {
            return new ValidationProblemDetails(CreateValidationErrors(errors));
        }

        private static Dictionary<string, string[]> CreateValidationErrors(params (string Field, string Message)[] errors)
        {
            var validationErrors = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

            foreach (var (field, message) in errors)
            {
                if (!validationErrors.TryGetValue(field, out var messages))
                {
                    messages = new List<string>();
                    validationErrors[field] = messages;
                }

                messages.Add(message);
            }

            return validationErrors.ToDictionary(pair => pair.Key, pair => pair.Value.ToArray(), StringComparer.OrdinalIgnoreCase);
        }

        private static ValidationProblemDetails CreateValidationProblem(Dictionary<string, string[]> errors)
        {
            return new ValidationProblemDetails(errors);
        }

        private static Dictionary<string, string[]> ToValidationProblemErrors(IdentityResult result)
        {
            var errors = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

            foreach (var error in result.Errors)
            {
                var field = error.Code switch
                {
                    "DuplicateUserName" => "Email",
                    "DuplicateEmail" => "Email",
                    "PasswordMismatch" => "ConfirmPassword",
                    "PasswordRequiresDigit" => "Password",
                    "PasswordRequiresLower" => "Password",
                    "PasswordRequiresUpper" => "Password",
                    "PasswordRequiresNonAlphanumeric" => "Password",
                    "PasswordTooShort" => "Password",
                    _ => "general"
                };

                if (!errors.TryGetValue(field, out var values))
                {
                    values = new List<string>();
                    errors[field] = values;
                }

                values.Add(error.Description);
            }

            return errors.ToDictionary(pair => pair.Key, pair => pair.Value.ToArray(), StringComparer.OrdinalIgnoreCase);
        }
    }
}