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
            public string? Description { get; set; }
            public string? ThumbnailPath { get; set; }
            public bool Liked { get; set; }
            public int LikeCount { get; set; }
            public int CommentCount { get; set; }
            public DateTime CreatedAt { get; set; }
        }

        public class PostDetailDto
        {
            public string Id { get; set; } = string.Empty;
            public string? Title { get; set; }
            public string? Body { get; set; }
            public string? AuthorName { get; set; }
            public string? ThumbnailPath { get; set; }
            public DateTime CreatedAt { get; set; }
            public bool CanDelete { get; set; }
            public CommentDto[] Comments { get; set; } = Array.Empty<CommentDto>();
            public bool Liked { get; set; }
            public int LikeCount { get; set; }

            public class CommentDto
            {
                public string Id { get; set; } = string.Empty;
                public string? AuthorName { get; set; }
                public string? Body { get; set; }
                public DateTime CreatedAt { get; set; }
                public bool CanDelete { get; set; }
            }
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

            var user = await _users.GetUserAsync(User);
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
                    Description = p.Description,
                    ThumbnailPath = p.ThumbnailPath,
                    Liked = userId != null && p.Likes.Any(l => l.UserId == userId),
                    LikeCount = p.LikeCount,
                    CommentCount = p.CommentCount,
                    CreatedAt = p.CreatedAtUtc
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

            var detail = new PostDetailDto
            {
                Id = post.Id.ToString(),
                Title = post.Title,
                Body = post.Description,
                AuthorName = post.AuthorUser.Name,
                ThumbnailPath = post.ThumbnailPath,
                CreatedAt = post.CreatedAtUtc,
                CanDelete = user != null && (post.AuthorUserId == user.Id || isAdmin),
                LikeCount = post.LikeCount,
                Liked = userId != null && post.Likes.Any(l => l.UserId == userId),
                Comments = post.Comments.OrderBy(c => c.CreatedAtUtc).Select(c => new PostDetailDto.CommentDto
                {
                    Id = c.Id.ToString(),
                    AuthorName = c.AuthorUser?.Name,
                    Body = c.Body,
                    CreatedAt = c.CreatedAtUtc,
                    CanDelete = user != null && (c.AuthorUserId == user.Id || isAdmin)
                }).ToArray()
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

            var post = await _db.Posts.Include(p => p.Likes).FirstOrDefaultAsync(p => p.Id == gid);
            if (post == null) return NotFound();

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

            var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == gid);
            if (post == null) return NotFound();

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
