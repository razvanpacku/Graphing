using System;

namespace Graphing.Server.Models
{
    public class Ban
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser User { get; set; } = null!;
        public string AdminUserId { get; set; } = string.Empty;
        public ApplicationUser AdminUser { get; set; } = null!;
        public Guid? SourceReportId { get; set; }
        public Report? SourceReport { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime StartedAtUtc { get; set; }
        public DateTime? EndsAtUtc { get; set; }
        public bool IsActive { get; set; } = true;
    }
}