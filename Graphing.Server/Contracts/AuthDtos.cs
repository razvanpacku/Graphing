using System.ComponentModel.DataAnnotations;

namespace Graphing.Server.Contracts
{
    public sealed record AuthUserDto(
        string Id,
        string Email,
        string Name,
        bool IsBanned,
        bool IsAdmin);

    public sealed record AuthResponse(
        string AccessToken,
        AuthUserDto User,
        DateTime ExpiresAtUtc);

    public sealed record RegisterRequest
    {
        [Required]
        [EmailAddress]
        [MaxLength(320)]
        public string Email { get; init; } = string.Empty;

        [Required]
        [MinLength(5)]
        [MaxLength(31)]
        public string Name { get; init; } = string.Empty;

        [Required]
        [MinLength(10)]
        [MaxLength(128)]
        public string Password { get; init; } = string.Empty;

        [Required]
        [Compare(nameof(Password))]
        public string ConfirmPassword { get; init; } = string.Empty;

        public bool RememberMe { get; init; }
    }

    public sealed record LoginRequest
    {
        [Required]
        [EmailAddress]
        [MaxLength(320)]
        public string Email { get; init; } = string.Empty;

        [Required]
        public string Password { get; init; } = string.Empty;

        public bool RememberMe { get; init; }
    }

    public sealed record AuthMessageResponse(string Message);
}