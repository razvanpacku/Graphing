using System;
using System.Linq;
using System.Threading.Tasks;
using Graphing.Server.Data;
using Graphing.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;

namespace Graphing.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PostsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _users;

        public PostsController(ApplicationDbContext db, UserManager<ApplicationUser> users)
        {
            _db = db;
            _users = users;
        }

        public class PostSummaryDto
        {
            public string Id { get; set; } = string.Empty;
            public string? Title { get; set; }
            public string? AuthorName { get; set; }
            public string AuthorUserId { get; set; } = string.Empty;
            public bool AuthorIsBanned { get; set; }
            public string? Description { get; set; }
            public string? ThumbnailPath { get; set; }
            public bool Liked { get; set; }
            public int LikeCount { get; set; }
            public int CommentCount { get; set; }
            public DateTime CreatedAt { get; set; }
            public bool CanReport { get; set; }
            public bool CanBanAuthor { get; set; }
        }

        public class PostDetailDto
        {
            public string Id { get; set; } = string.Empty;
            public string? Title { get; set; }
            public string? Body { get; set; }
            public string? AuthorName { get; set; }
            public string AuthorUserId { get; set; } = string.Empty;
            public bool AuthorIsBanned { get; set; }
            public string? ThumbnailPath { get; set; }
            public DateTime CreatedAt { get; set; }
            public bool CanDelete { get; set; }
            public bool CanReport { get; set; }
            public bool CanBanAuthor { get; set; }
            public CommentDto[] Comments { get; set; } = Array.Empty<CommentDto>();
            public bool Liked { get; set; }
            public int LikeCount { get; set; }

            public class CommentDto
            {
                public string Id { get; set; } = string.Empty;
                public string? AuthorName { get; set; }
                public string AuthorUserId { get; set; } = string.Empty;
                public bool AuthorIsBanned { get; set; }
                public string? Body { get; set; }
                public DateTime CreatedAt { get; set; }
                public bool CanDelete { get; set; }
                public bool CanReport { get; set; }
                public bool CanBanAuthor { get; set; }
            }
        }

        public class ReportRequest
        {
            public string ReasonCode { get; set; } = string.Empty;
            public string? Details { get; set; }
        }

        public class PagedResult<T>
        {
            public T[] Items { get; set; } = Array.Empty<T>();
            public int Total { get; set; }
        }

        public enum PostSortMode
        {
            Newest,
            Popular
        }

        public enum PopularWindowMode
        {
            AllTime,
            Month,
            Week,
            Day
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<PostSummaryDto>>> Get(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] PostSortMode sort = PostSortMode.Newest,
            [FromQuery] PopularWindowMode window = PopularWindowMode.AllTime)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _db.Posts
                .Include(p => p.AuthorUser)
                .Include(p => p.Likes)
                .AsQueryable();

            var user = await _users.GetUserAsync(User);
            var isAdmin = user != null && await _users.IsInRoleAsync(user, "Admin");

            if (!isAdmin)
            {
                query = query.Where(p => !p.AuthorUser.isBanned);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(p =>
                    p.Title.Contains(term) ||
                    (p.Description != null && p.Description.Contains(term)) ||
                    p.AuthorUser.Name.Contains(term));
            }

            var cutoff = window switch
            {
                PopularWindowMode.Day => DateTime.UtcNow.Date,
                PopularWindowMode.Week => DateTime.UtcNow.Date.AddDays(-7),
                PopularWindowMode.Month => new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc),
                _ => DateTime.MinValue
            };

            var userId = user?.Id;

            var total = await query.CountAsync();

            IQueryable<Post> orderedQuery = sort == PostSortMode.Popular
                ? query.OrderByDescending(p => p.Likes.Count(l => l.CreatedAtUtc >= cutoff)).ThenByDescending(p => p.CreatedAtUtc)
                : query.OrderByDescending(p => p.CreatedAtUtc);

            var items = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PostSummaryDto
                {
                    Id = p.Id.ToString(),
                    Title = p.Title,
                    AuthorName = p.AuthorUser.Name,
                    AuthorUserId = p.AuthorUserId,
                    AuthorIsBanned = p.AuthorUser.isBanned,
                    Description = p.Description,
                    ThumbnailPath = p.ThumbnailPath,
                    Liked = userId != null && p.Likes.Any(l => l.UserId == userId),
                    LikeCount = p.LikeCount,
                    CommentCount = p.CommentCount,
                    CreatedAt = p.CreatedAtUtc,
                    CanReport = user != null && !isAdmin && p.AuthorUserId != user.Id && !p.AuthorUser.isBanned,
                    CanBanAuthor = isAdmin && user != null && p.AuthorUserId != user.Id
                })
                .ToArrayAsync();

            return Ok(new PagedResult<PostSummaryDto> { Items = items, Total = total });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PostDetailDto>> GetById(string id)
        {
            if (!Guid.TryParse(id, out var gid)) return NotFound();
            var post = await _db.Posts
                .Include(p => p.AuthorUser)
                .Include(p => p.Comments)
                .ThenInclude(c => c.AuthorUser)
                .Include(p => p.Likes)
                .FirstOrDefaultAsync(p => p.Id == gid);

            if (post == null) return NotFound();

            var user = await _users.GetUserAsync(User);
            var userId = user?.Id;
            var isAdmin = user != null && await _users.IsInRoleAsync(user, "Admin");

            if (!isAdmin && post.AuthorUser.isBanned)
            {
                return NotFound();
            }

            var detail = new PostDetailDto
            {
                Id = post.Id.ToString(),
                Title = post.Title,
                Body = post.Description,
                AuthorName = post.AuthorUser.Name,
                AuthorUserId = post.AuthorUserId,
                AuthorIsBanned = post.AuthorUser.isBanned,
                ThumbnailPath = post.ThumbnailPath,
                CreatedAt = post.CreatedAtUtc,
                CanDelete = user != null && (post.AuthorUserId == user.Id || isAdmin),
                CanReport = user != null && !isAdmin && post.AuthorUserId != user.Id && !post.AuthorUser.isBanned,
                CanBanAuthor = isAdmin && user != null && post.AuthorUserId != user.Id,
                LikeCount = post.LikeCount,
                Liked = userId != null && post.Likes.Any(l => l.UserId == userId),
                Comments = post.Comments
                    .Where(c => isAdmin || (c.AuthorUser != null && !c.AuthorUser.isBanned))
                    .OrderBy(c => c.CreatedAtUtc)
                    .Select(c => new PostDetailDto.CommentDto
                    {
                        Id = c.Id.ToString(),
                        AuthorName = c.AuthorUser?.Name,
                        AuthorUserId = c.AuthorUserId,
                        AuthorIsBanned = c.AuthorUser != null && c.AuthorUser.isBanned,
                        Body = c.Body,
                        CreatedAt = c.CreatedAtUtc,
                        CanDelete = user != null && (c.AuthorUserId == user.Id || isAdmin),
                        CanReport = user != null && !isAdmin && c.AuthorUserId != user.Id && c.AuthorUser != null && !c.AuthorUser.isBanned,
                        CanBanAuthor = isAdmin && user != null && c.AuthorUserId != user.Id
                    })
                    .ToArray()
            };

            return Ok(detail);
        }

        public class PostSceneDto
        {
            public string PostId { get; set; } = string.Empty;
            public string SceneVersionId { get; set; } = string.Empty;
            public string SceneId { get; set; } = string.Empty;
            public string Title { get; set; } = string.Empty;
            public string? Description { get; set; }
            public string SceneJson { get; set; } = string.Empty;
            public string CameraJson { get; set; } = string.Empty;
            public string? ThumbnailPath { get; set; }
            public DateTime CreatedAt { get; set; }
        }

        [HttpGet("{id}/scene")]
        public async Task<ActionResult<PostSceneDto>> GetScene(string id)
        {
            if (!Guid.TryParse(id, out var postId)) return NotFound();

            var post = await _db.Posts
                .Include(p => p.SceneVersion)
                .ThenInclude(version => version.Scene)
                .FirstOrDefaultAsync(p => p.Id == postId);

            if (post == null || post.SceneVersion == null) return NotFound();

            return Ok(new PostSceneDto
            {
                PostId = post.Id.ToString(),
                SceneVersionId = post.SceneVersionId.ToString(),
                SceneId = post.SceneVersion.SceneId.ToString(),
                Title = post.Title,
                Description = post.Description,
                SceneJson = post.SceneVersion.SceneJson,
                CameraJson = post.SceneVersion.CameraJson,
                ThumbnailPath = post.SceneVersion.ThumbnailPath ?? post.ThumbnailPath,
                CreatedAt = post.CreatedAtUtc
            });
        }

        public class CreatePostRequest
        {
            public string SceneVersionId { get; set; } = string.Empty;
            public string Title { get; set; } = string.Empty;
            public string? Description { get; set; }
            public string? ThumbnailPath { get; set; }
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult<object>> CreatePost([FromBody] CreatePostRequest req)
        {
            var user = await _users.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (!Guid.TryParse(req.SceneVersionId, out var vid)) return BadRequest("invalid sceneVersionId");

            var version = await _db.GraphSceneVersions.Include(v => v.Scene).FirstOrDefaultAsync(v => v.Id == vid);
            if (version == null) return NotFound("scene version not found");

            // basic ownership check: require that the current user created the version or owns the scene
            if (version.CreatedByUserId != user.Id && version.Scene.OwnerUserId != user.Id)
            {
                return Forbid();
            }

            var now = DateTime.UtcNow;
            var post = new Post
            {
                Id = Guid.NewGuid(),
                SceneVersionId = version.Id,
                AuthorUserId = user.Id,
                Title = req.Title ?? string.Empty,
                Description = req.Description,
                ThumbnailPath = req.ThumbnailPath ?? version.ThumbnailPath,
                LikeCount = 0,
                CommentCount = 0,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                Status = PostStatus.Active
            };

            _db.Posts.Add(post);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = post.Id.ToString() }, new { id = post.Id.ToString() });
        }

        public class AddCommentRequest
        {
            public string Body { get; set; } = string.Empty;
        }

        private static string NormalizeReasonCode(string? value)
        {
            var reasonCode = value?.Trim();
            return string.IsNullOrWhiteSpace(reasonCode) ? "other" : reasonCode;
        }

        private static string NormalizeDetails(string? value)
        {
            var details = value?.Trim();
            if (string.IsNullOrWhiteSpace(details))
            {
                return "No additional details provided.";
            }

            return details.Length <= 4000 ? details : details.Substring(0, 4000);
        }

        [Authorize]
        [HttpPost("{id}/report")]
        public async Task<ActionResult> ReportPost(string id, [FromBody] ReportRequest req)
        {
            if (!Guid.TryParse(id, out var postId)) return NotFound();

            var reporter = await _users.GetUserAsync(User);
            if (reporter == null) return Unauthorized();

            var isAdmin = await _users.IsInRoleAsync(reporter, "Admin");
            var post = await _db.Posts.Include(p => p.AuthorUser).FirstOrDefaultAsync(p => p.Id == postId);
            if (post == null) return NotFound();
            if (!isAdmin && post.AuthorUser.isBanned) return NotFound();
            if (post.AuthorUserId == reporter.Id) return BadRequest("You cannot report your own post.");

            var targetId = post.Id.ToString();
            var alreadyOpen = await _db.Reports.AnyAsync(r =>
                r.ReporterUserId == reporter.Id &&
                r.TargetType == ReportTargetType.Post &&
                r.TargetId == targetId &&
                r.Status == ReportStatus.Open);

            if (alreadyOpen)
            {
                return Conflict("You already have an open report for this post.");
            }

            _db.Reports.Add(new Report
            {
                Id = Guid.NewGuid(),
                ReporterUserId = reporter.Id,
                TargetType = ReportTargetType.Post,
                TargetId = targetId,
                TargetPostId = post.Id,
                ReasonCode = NormalizeReasonCode(req?.ReasonCode),
                Details = NormalizeDetails(req?.Details),
                Status = ReportStatus.Open,
                CreatedAtUtc = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [Authorize]
        [HttpPost("{postId}/comments/{commentId}/report")]
        public async Task<ActionResult> ReportComment(string postId, string commentId, [FromBody] ReportRequest req)
        {
            if (!Guid.TryParse(postId, out var postGuid)) return NotFound();
            if (!Guid.TryParse(commentId, out var commentGuid)) return NotFound();

            var reporter = await _users.GetUserAsync(User);
            if (reporter == null) return Unauthorized();

            var isAdmin = await _users.IsInRoleAsync(reporter, "Admin");
            var comment = await _db.Comments
                .Include(c => c.AuthorUser)
                .FirstOrDefaultAsync(c => c.Id == commentGuid && c.PostId == postGuid);

            if (comment == null) return NotFound();
            if (!isAdmin && comment.AuthorUser.isBanned) return NotFound();
            if (comment.AuthorUserId == reporter.Id) return BadRequest("You cannot report your own comment.");

            var targetId = comment.Id.ToString();
            var alreadyOpen = await _db.Reports.AnyAsync(r =>
                r.ReporterUserId == reporter.Id &&
                r.TargetType == ReportTargetType.Comment &&
                r.TargetId == targetId &&
                r.Status == ReportStatus.Open);

            if (alreadyOpen)
            {
                return Conflict("You already have an open report for this comment.");
            }

            _db.Reports.Add(new Report
            {
                Id = Guid.NewGuid(),
                ReporterUserId = reporter.Id,
                TargetType = ReportTargetType.Comment,
                TargetId = targetId,
                TargetPostId = comment.PostId,
                ReasonCode = NormalizeReasonCode(req?.ReasonCode),
                Details = NormalizeDetails(req?.Details),
                Status = ReportStatus.Open,
                CreatedAtUtc = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return NoContent();
        }

        private async Task<bool> CanDeletePostAsync(ApplicationUser user, Post post)
        {
            return post.AuthorUserId == user.Id || await _users.IsInRoleAsync(user, "Admin");
        }

        private async Task<bool> CanDeleteCommentAsync(ApplicationUser user, Comment comment)
        {
            return comment.AuthorUserId == user.Id || await _users.IsInRoleAsync(user, "Admin");
        }

        [Authorize]
        [HttpPost("{id}/like")]
        public async Task<ActionResult> ToggleLike(string id)
        {
            if (!Guid.TryParse(id, out var gid)) return NotFound();
            var user = await _users.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var isAdmin = await _users.IsInRoleAsync(user, "Admin");

            var post = await _db.Posts
                .Include(p => p.AuthorUser)
                .Include(p => p.Likes)
                .FirstOrDefaultAsync(p => p.Id == gid);
            if (post == null) return NotFound();
            if (!isAdmin && post.AuthorUser.isBanned) return NotFound();

            var existing = post.Likes.FirstOrDefault(l => l.UserId == user.Id);
            if (existing != null)
            {
                _db.PostLikes.Remove(existing);
                post.LikeCount = Math.Max(0, post.LikeCount - 1);
            }
            else
            {
                var like = new PostLike { Id = Guid.NewGuid(), PostId = post.Id, UserId = user.Id, CreatedAtUtc = DateTime.UtcNow };
                _db.PostLikes.Add(like);
                post.LikeCount = post.LikeCount + 1;
            }

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [Authorize]
        [HttpPost("{id}/comments")]
        public async Task<ActionResult> AddComment(string id, [FromBody] AddCommentRequest req)
        {
            if (string.IsNullOrWhiteSpace(req?.Body)) return BadRequest();
            if (!Guid.TryParse(id, out var gid)) return NotFound();
            var user = await _users.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var isAdmin = await _users.IsInRoleAsync(user, "Admin");

            var post = await _db.Posts.Include(p => p.AuthorUser).FirstOrDefaultAsync(p => p.Id == gid);
            if (post == null) return NotFound();
            if (!isAdmin && post.AuthorUser.isBanned) return NotFound();

            var comment = new Comment
            {
                Id = Guid.NewGuid(),
                PostId = post.Id,
                AuthorUserId = user.Id,
                Body = req.Body,
                CreatedAtUtc = DateTime.UtcNow
            };

            _db.Comments.Add(comment);
            post.CommentCount = post.CommentCount + 1;
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = post.Id.ToString() }, null);
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeletePost(string id)
        {
            if (!Guid.TryParse(id, out var gid)) return NotFound();
            var user = await _users.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == gid);
            if (post == null) return NotFound();

            if (!await CanDeletePostAsync(user, post)) return Forbid();

            _db.Posts.Remove(post);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [Authorize]
        [HttpDelete("{postId}/comments/{commentId}")]
        public async Task<ActionResult> DeleteComment(string postId, string commentId)
        {
            if (!Guid.TryParse(postId, out var postGuid)) return NotFound();
            if (!Guid.TryParse(commentId, out var commentGuid)) return NotFound();

            var user = await _users.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == postGuid);
            if (post == null) return NotFound();

            var comment = await _db.Comments.FirstOrDefaultAsync(c => c.Id == commentGuid && c.PostId == postGuid);
            if (comment == null) return NotFound();

            if (!await CanDeleteCommentAsync(user, comment)) return Forbid();

            _db.Comments.Remove(comment);
            post.CommentCount = Math.Max(0, post.CommentCount - 1);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
