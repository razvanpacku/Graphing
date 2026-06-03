using System;

namespace Graphing.Server.Models
{
    public class Report
    {
        public Guid Id { get; set; }
        public string ReporterUserId { get; set; } = string.Empty;
        public ApplicationUser ReporterUser { get; set; } = null!;
        public ReportTargetType TargetType { get; set; }
        public string TargetId { get; set; } = string.Empty;
        public string ReasonCode { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public ReportStatus Status { get; set; } = ReportStatus.Open;
        public string? ReviewedByUserId { get; set; }
        public ApplicationUser? ReviewedByUser { get; set; }
        public DateTime? ReviewedAtUtc { get; set; }
        public string? ResolutionNotes { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }
}