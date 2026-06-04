using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Graphing.Server.Data;
using Graphing.Server.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Graphing.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class ModerationController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _users;

        public ModerationController(ApplicationDbContext db, UserManager<ApplicationUser> users)
        {
            _db = db;
            _users = users;
        }

        public class ReportListItemDto
        {
            public string Id { get; set; } = string.Empty;
            public string ReporterUserId { get; set; } = string.Empty;
            public string ReporterName { get; set; } = string.Empty;
            public ReportTargetType TargetType { get; set; }
            public string TargetId { get; set; } = string.Empty;
            public string? TargetPostId { get; set; }
            public string? TargetPostTitle { get; set; }
            public string ReasonCode { get; set; } = string.Empty;
            public string Details { get; set; } = string.Empty;
            public ReportStatus Status { get; set; }
            public DateTime CreatedAtUtc { get; set; }
            public string? ReviewedByUserId { get; set; }
            public string? ReviewedByName { get; set; }
            public DateTime? ReviewedAtUtc { get; set; }
            public string? ResolutionNotes { get; set; }
            public string? TargetAuthorUserId { get; set; }
            public string? TargetAuthorName { get; set; }
            public bool TargetAuthorIsBanned { get; set; }
            public string? TargetPreview { get; set; }
        }

        public class BanListItemDto
        {
            public string Id { get; set; } = string.Empty;
            public string UserId { get; set; } = string.Empty;
            public string UserName { get; set; } = string.Empty;
            public string AdminUserId { get; set; } = string.Empty;
            public string AdminName { get; set; } = string.Empty;
            public string Reason { get; set; } = string.Empty;
            public string? Notes { get; set; }
            public DateTime StartedAtUtc { get; set; }
            public DateTime? EndsAtUtc { get; set; }
            public bool IsActive { get; set; }
            public string? SourceReportId { get; set; }
            public string? SourceReportTargetType { get; set; }
            public string? SourceReportTargetId { get; set; }
            public string? SourceReportTargetPostId { get; set; }
            public string? SourceReportTargetPostTitle { get; set; }
            public string? SourceReportReasonCode { get; set; }
        }

        public class BanUserRequest
        {
            public string Reason { get; set; } = string.Empty;
            public string? Notes { get; set; }
            public string? SourceReportId { get; set; }
        }

        public class UnbanUserRequest
        {
            public string? Notes { get; set; }
        }

        public class UpdateReportStatusRequest
        {
            public string Status { get; set; } = string.Empty;
            public string? ResolutionNotes { get; set; }
        }

        public class PagedResult<T>
        {
            public T[] Items { get; set; } = Array.Empty<T>();
            public int Total { get; set; }
        }

        [HttpGet("reports")]
        public async Task<ActionResult<PagedResult<ReportListItemDto>>> GetReports([FromQuery] ReportStatus? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _db.Reports
                .Include(r => r.ReporterUser)
                .Include(r => r.ReviewedByUser)
                .AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(r => r.Status == status.Value);
            }

            var total = await query.CountAsync();

            var reports = await query
                .OrderBy(r => r.Status == ReportStatus.Open ? 0 : 1)
                .ThenByDescending(r => r.CreatedAtUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var postIds = reports
                .Where(r => r.TargetType == ReportTargetType.Post)
                .Select(r => Guid.TryParse(r.TargetId, out var parsed) ? parsed : Guid.Empty)
                .Where(id => id != Guid.Empty)
                .Distinct()
                .ToArray();

            var commentIds = reports
                .Where(r => r.TargetType == ReportTargetType.Comment)
                .Select(r => Guid.TryParse(r.TargetId, out var parsed) ? parsed : Guid.Empty)
                .Where(id => id != Guid.Empty)
                .Distinct()
                .ToArray();

            var commentTargets = await _db.Comments
                .Include(c => c.AuthorUser)
                .Where(c => commentIds.Contains(c.Id))
                .Select(c => new
                {
                    Id = c.Id.ToString(),
                    PostId = c.PostId,
                    AuthorUserId = c.AuthorUserId,
                    AuthorName = c.AuthorUser.Name,
                    AuthorIsBanned = c.AuthorUser.isBanned,
                    Preview = c.Body.Length <= 140 ? c.Body : c.Body.Substring(0, 140)
                })
                .ToListAsync();

            postIds = postIds
                .Concat(commentTargets.Select(target => target.PostId))
                .Distinct()
                .ToArray();

            var postLookup = await _db.Posts
                .Include(p => p.AuthorUser)
                .Where(p => postIds.Contains(p.Id))
                .Select(p => new
                {
                    Key = p.Id,
                    Id = p.Id.ToString(),
                    AuthorUserId = p.AuthorUserId,
                    AuthorName = p.AuthorUser.Name,
                    AuthorIsBanned = p.AuthorUser.isBanned,
                    Preview = p.Title
                })
                .ToDictionaryAsync(p => p.Key, p => p);

            var commentLookup = commentTargets.ToDictionary(c => c.Id, c => c);

            var result = reports.Select(report =>
            {
                string? targetAuthorUserId = null;
                string? targetAuthorName = null;
                var targetAuthorIsBanned = false;
                string? targetPreview = null;
                string? targetPostId = report.TargetPostId?.ToString();
                string? targetPostTitle = null;

                if (report.TargetType == ReportTargetType.Post && Guid.TryParse(report.TargetId, out var reportPostId) && postLookup.TryGetValue(reportPostId, out var post))
                {
                    targetAuthorUserId = post.AuthorUserId;
                    targetAuthorName = post.AuthorName;
                    targetAuthorIsBanned = post.AuthorIsBanned;
                    targetPreview = post.Preview;
                    targetPostId = post.Id;
                    targetPostTitle = post.Preview;
                }
                else if (report.TargetType == ReportTargetType.Comment && commentLookup.TryGetValue(report.TargetId, out var comment))
                {
                    targetAuthorUserId = comment.AuthorUserId;
                    targetAuthorName = comment.AuthorName;
                    targetAuthorIsBanned = comment.AuthorIsBanned;
                    targetPreview = comment.Preview;
                    targetPostId = report.TargetPostId?.ToString() ?? comment.PostId.ToString();
                    var parentPostId = report.TargetPostId ?? comment.PostId;
                    if (postLookup.TryGetValue(parentPostId, out var parentPost))
                    {
                        targetPostTitle = parentPost.Preview;
                    }
                }

                return new ReportListItemDto
                {
                    Id = report.Id.ToString(),
                    ReporterUserId = report.ReporterUserId,
                    ReporterName = report.ReporterUser.Name,
                    TargetType = report.TargetType,
                    TargetId = report.TargetId,
                    ReasonCode = report.ReasonCode,
                    Details = report.Details,
                    Status = report.Status,
                    CreatedAtUtc = report.CreatedAtUtc,
                    ReviewedByUserId = report.ReviewedByUserId,
                    ReviewedByName = report.ReviewedByUser?.Name,
                    ReviewedAtUtc = report.ReviewedAtUtc,
                    ResolutionNotes = report.ResolutionNotes,
                    TargetAuthorUserId = targetAuthorUserId,
                    TargetAuthorName = targetAuthorName,
                    TargetAuthorIsBanned = targetAuthorIsBanned,
                    TargetPreview = targetPreview,
                    TargetPostId = targetPostId,
                    TargetPostTitle = targetPostTitle
                };
            }).ToArray();
            
            // Backfill any missing comment author info by querying comments directly (fallback for edge cases)
            var resultList = result.ToList();
            for (int i = 0; i < resultList.Count; i++)
            {
                var dto = resultList[i];
                if (dto.TargetAuthorUserId == null && dto.TargetType == ReportTargetType.Comment)
                {
                    if (Guid.TryParse(dto.TargetId, out var commentGuid))
                    {
                        var commentEntity = await _db.Comments.Include(c => c.AuthorUser).FirstOrDefaultAsync(c => c.Id == commentGuid);
                        if (commentEntity != null)
                        {
                            dto.TargetAuthorUserId = commentEntity.AuthorUserId;
                            dto.TargetAuthorName = commentEntity.AuthorUser?.Name;
                            dto.TargetAuthorIsBanned = commentEntity.AuthorUser?.isBanned ?? false;
                            dto.TargetPreview = commentEntity.Body.Length <= 140 ? commentEntity.Body : commentEntity.Body.Substring(0, 140);
                            dto.TargetPostId = dto.TargetPostId ?? commentEntity.PostId.ToString();
                            if (postLookup.TryGetValue(commentEntity.PostId, out var parentPost))
                            {
                                dto.TargetPostTitle = parentPost.Preview;
                            }
                        }
                    }
                }
            }
            return Ok(new PagedResult<ReportListItemDto>
            {
                Items = result,
                Total = total
            });
        }

        [HttpGet("bans")]
        public async Task<ActionResult<PagedResult<BanListItemDto>>> GetBans([FromQuery] bool activeOnly = true, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _db.Bans
                .Include(b => b.User)
                .Include(b => b.AdminUser)
                .AsQueryable();

            if (activeOnly)
            {
                query = query.Where(b => b.IsActive);
            }

            var total = await query.CountAsync();

            var bans = await query
                .OrderByDescending(b => b.IsActive)
                .ThenByDescending(b => b.StartedAtUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var sourceReportIds = bans
                .Where(b => b.SourceReportId.HasValue)
                .Select(b => b.SourceReportId!.Value)
                .Distinct()
                .ToArray();

            var sourceReports = await _db.Reports
                .Where(report => sourceReportIds.Contains(report.Id))
                .ToListAsync();

            var sourceCommentIds = sourceReports
                .Where(report => report.TargetType == ReportTargetType.Comment)
                .Select(report => Guid.TryParse(report.TargetId, out var parsed) ? parsed : Guid.Empty)
                .Where(id => id != Guid.Empty)
                .Distinct()
                .ToArray();

            var sourceCommentTargets = await _db.Comments
                .Where(comment => sourceCommentIds.Contains(comment.Id))
                .Select(comment => new
                {
                    Id = comment.Id,
                    PostId = comment.PostId
                })
                .ToListAsync();

            var sourcePostIds = sourceReports
                .Where(report => report.TargetType == ReportTargetType.Post)
                .Select(report => Guid.TryParse(report.TargetId, out var parsed) ? parsed : Guid.Empty)
                .Where(id => id != Guid.Empty)
                .Concat(sourceCommentTargets.Select(comment => comment.PostId))
                .Distinct()
                .ToArray();

            var sourcePostTitles = await _db.Posts
                .Where(post => sourcePostIds.Contains(post.Id))
                .Select(post => new { post.Id, post.Title })
                .ToDictionaryAsync(post => post.Id, post => post.Title);

            var sourceReportLookup = sourceReports.ToDictionary(report => report.Id, report => report);
            var sourceCommentLookup = sourceCommentTargets.ToDictionary(comment => comment.Id, comment => comment.PostId);

            var bansDtos = bans.Select(ban =>
            {
                string? sourceReportTargetType = null;
                string? sourceReportTargetId = null;
                string? sourceReportTargetPostId = null;
                string? sourceReportTargetPostTitle = null;
                string? sourceReportReasonCode = null;

                if (ban.SourceReportId.HasValue && sourceReportLookup.TryGetValue(ban.SourceReportId.Value, out var sourceReport))
                {
                    sourceReportTargetType = sourceReport.TargetType.ToString();
                    sourceReportTargetId = sourceReport.TargetId;
                    sourceReportReasonCode = sourceReport.ReasonCode;

                    if (sourceReport.TargetType == ReportTargetType.Post && Guid.TryParse(sourceReport.TargetId, out var sourcePostId) && sourcePostTitles.TryGetValue(sourcePostId, out var sourcePostTitle))
                    {
                        sourceReportTargetPostId = sourcePostId.ToString();
                        sourceReportTargetPostTitle = sourcePostTitle;
                    }
                    else if (sourceReport.TargetType == ReportTargetType.Comment && Guid.TryParse(sourceReport.TargetId, out var sourceCommentId) && sourceCommentLookup.TryGetValue(sourceCommentId, out var sourceCommentPostId))
                    {
                        sourceReportTargetPostId = sourceCommentPostId.ToString();
                        if (sourcePostTitles.TryGetValue(sourceCommentPostId, out var sourceParentTitle))
                        {
                            sourceReportTargetPostTitle = sourceParentTitle;
                        }
                    }
                }

                return new BanListItemDto
                {
                    Id = ban.Id.ToString(),
                    UserId = ban.UserId,
                    UserName = ban.User.Name,
                    AdminUserId = ban.AdminUserId,
                    AdminName = ban.AdminUser.Name,
                    Reason = ban.Reason,
                    Notes = ban.Notes,
                    StartedAtUtc = ban.StartedAtUtc,
                    EndsAtUtc = ban.EndsAtUtc,
                    IsActive = ban.IsActive,
                    SourceReportId = ban.SourceReportId.HasValue ? ban.SourceReportId.Value.ToString() : null,
                    SourceReportTargetType = sourceReportTargetType,
                    SourceReportTargetId = sourceReportTargetId,
                    SourceReportTargetPostId = sourceReportTargetPostId,
                    SourceReportTargetPostTitle = sourceReportTargetPostTitle,
                    SourceReportReasonCode = sourceReportReasonCode
                };
            }).ToArray();

            return Ok(new PagedResult<BanListItemDto>
            {
                Items = bansDtos,
                Total = total
            });
        }

        [HttpPost("users/{userId}/ban")]
        public async Task<ActionResult> BanUser(string userId, [FromBody] BanUserRequest request)
        {
            var admin = await _users.GetUserAsync(User);
            if (admin == null) return Unauthorized();

            var user = await _users.FindByIdAsync(userId);
            if (user == null) return NotFound();

            if (user.Id == admin.Id)
            {
                return BadRequest("You cannot ban yourself.");
            }

            if (await _users.IsInRoleAsync(user, "Admin"))
            {
                return BadRequest("Admin users cannot be banned.");
            }

            var hasActiveBan = await _db.Bans.AnyAsync(b => b.UserId == user.Id && b.IsActive);
            if (hasActiveBan || user.isBanned)
            {
                return Conflict("This user is already banned.");
            }

            Guid? sourceReportGuid = null;
            if (!string.IsNullOrWhiteSpace(request.SourceReportId) && Guid.TryParse(request.SourceReportId, out var parsedReportId))
            {
                sourceReportGuid = parsedReportId;
            }

            var reason = request.Reason?.Trim();
            if (string.IsNullOrWhiteSpace(reason))
            {
                reason = "Violation of community rules";
            }

            var ban = new Ban
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                AdminUserId = admin.Id,
                SourceReportId = sourceReportGuid,
                Reason = reason,
                Notes = request.Notes?.Trim(),
                StartedAtUtc = DateTime.UtcNow,
                IsActive = true
            };

            user.isBanned = true;
            _db.Bans.Add(ban);

            if (sourceReportGuid.HasValue)
            {
                var sourceReport = await _db.Reports.FirstOrDefaultAsync(r => r.Id == sourceReportGuid.Value);
                if (sourceReport != null)
                {
                    sourceReport.Status = ReportStatus.Actioned;
                    sourceReport.ReviewedByUserId = admin.Id;
                    sourceReport.ReviewedAtUtc = DateTime.UtcNow;
                    if (string.IsNullOrWhiteSpace(sourceReport.ResolutionNotes))
                    {
                        sourceReport.ResolutionNotes = $"User banned: {reason}";
                    }
                }
            }

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("users/{userId}/unban")]
        public async Task<ActionResult> UnbanUser(string userId, [FromBody] UnbanUserRequest? request = null)
        {
            var admin = await _users.GetUserAsync(User);
            if (admin == null) return Unauthorized();

            var user = await _users.FindByIdAsync(userId);
            if (user == null) return NotFound();

            var activeBans = await _db.Bans.Where(b => b.UserId == user.Id && b.IsActive).ToListAsync();
            if (!activeBans.Any() && !user.isBanned)
            {
                return Conflict("This user is not currently banned.");
            }

            var noteSuffix = string.IsNullOrWhiteSpace(request?.Notes)
                ? null
                : $" | Unban note: {request!.Notes!.Trim()}";

            foreach (var ban in activeBans)
            {
                ban.IsActive = false;
                ban.EndsAtUtc = DateTime.UtcNow;
                if (!string.IsNullOrWhiteSpace(noteSuffix))
                {
                    ban.Notes = string.IsNullOrWhiteSpace(ban.Notes)
                        ? noteSuffix.TrimStart(' ', '|')
                        : $"{ban.Notes}{noteSuffix}";
                }
            }

            user.isBanned = false;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("reports/{reportId}/status")]
        public async Task<ActionResult> UpdateReportStatus(string reportId, [FromBody] UpdateReportStatusRequest request)
        {
            if (!Guid.TryParse(reportId, out var reportGuid)) return NotFound();

            var admin = await _users.GetUserAsync(User);
            if (admin == null) return Unauthorized();

            var report = await _db.Reports.FirstOrDefaultAsync(r => r.Id == reportGuid);
            if (report == null) return NotFound();

            if (!Enum.TryParse<ReportStatus>(request.Status, true, out var parsedStatus))
            {
                return BadRequest($"Unknown report status '{request.Status}'.");
            }

            report.Status = parsedStatus;
            report.ReviewedByUserId = admin.Id;
            report.ReviewedAtUtc = DateTime.UtcNow;
            report.ResolutionNotes = string.IsNullOrWhiteSpace(request.ResolutionNotes)
                ? report.ResolutionNotes
                : request.ResolutionNotes.Trim();

            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
