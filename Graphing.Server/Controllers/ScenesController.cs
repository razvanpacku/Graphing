using System;
using System.Linq;
using System.Threading.Tasks;
using Graphing.Server.Data;
using Graphing.Server.Models;
using Graphing.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Graphing.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScenesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _users;
        private readonly SceneThumbnailStorageService _thumbnailStorage;

        public ScenesController(ApplicationDbContext db, UserManager<ApplicationUser> users, SceneThumbnailStorageService thumbnailStorage)
        {
            _db = db;
            _users = users;
            _thumbnailStorage = thumbnailStorage;
        }

        public class SceneSummaryDto
        {
            public string Id { get; set; } = string.Empty;
            public string? Title { get; set; }
            public SceneVisibility Visibility { get; set; }
            public string? ThumbnailPath { get; set; }
            public DateTime CreatedAt { get; set; }
            public DateTime UpdatedAt { get; set; }
            public bool CanEdit { get; set; }
        }

        public class SceneSaveResponse
        {
            public string Id { get; set; } = string.Empty;
            public string? ThumbnailPath { get; set; }
            public string? Title { get; set; }
            public string? Description { get; set; }
            public DateTime UpdatedAtUtc { get; set; }
        }

        public class PagedResult<T>
        {
            public T[] Items { get; set; } = Array.Empty<T>();
            public int Total { get; set; }
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<SceneSummaryDto>>> Get([FromQuery] bool ownerOnly = false, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _db.GraphScenes.AsQueryable();

            if (ownerOnly)
            {
                var user = await _users.GetUserAsync(User);
                if (user == null) return Unauthorized();
                query = query.Where(s => s.OwnerUserId == user.Id);
            }
            else
            {
                // only published scenes for anonymous listing
                query = query.Where(s => s.Visibility == SceneVisibility.Published);
            }

            var total = await query.CountAsync();
            var items = await query.OrderByDescending(s => s.UpdatedAtUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new SceneSummaryDto
                {
                    Id = s.Id.ToString(),
                    Title = s.Title,
                    Visibility = s.Visibility,
                    ThumbnailPath = s.ThumbnailPath,
                    CreatedAt = s.CreatedAtUtc,
                    UpdatedAt = s.UpdatedAtUtc,
                    CanEdit = ownerOnly
                })
                .ToArrayAsync();

            return Ok(new PagedResult<SceneSummaryDto> { Items = items, Total = total });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetById(string id)
        {
            if (!Guid.TryParse(id, out var gid)) return NotFound();
            var scene = await _db.GraphScenes.Include(s => s.Versions).FirstOrDefaultAsync(s => s.Id == gid);
            if (scene == null) return NotFound();

            // if private, only owner can view
            var user = await _users.GetUserAsync(User);
            var isOwner = user != null && user.Id == scene.OwnerUserId;

            if (scene.Visibility == SceneVisibility.Private && !isOwner)
            {
                return Forbid();
            }

            return Ok(new
            {
                id = scene.Id,
                title = scene.Title,
                description = scene.Description,
                visibility = scene.Visibility,
                canEdit = isOwner,
                thumbnailPath = scene.ThumbnailPath,
                sceneJson = scene.SceneJson,
                cameraJson = scene.CameraJson,
                createdAt = scene.CreatedAtUtc,
                updatedAt = scene.UpdatedAtUtc,
                versions = scene.Versions.Select(v => new { id = v.Id, v.VersionNumber, v.CreatedAtUtc })
            });
        }

        public class SaveSceneRequest
        {
            public string? Title { get; set; }
            public string? Description { get; set; }
            public string SceneJson { get; set; } = string.Empty;
            public string CameraJson { get; set; } = string.Empty;
            public SceneVisibility Visibility { get; set; } = SceneVisibility.Private;
            public string? ThumbnailDataUrl { get; set; }
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult<object>> Create([FromBody] SaveSceneRequest req)
        {
            var user = await _users.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var now = DateTime.UtcNow;
            var scene = new GraphScene
            {
                Id = Guid.NewGuid(),
                OwnerUserId = user.Id,
                Title = req.Title ?? string.Empty,
                Description = req.Description,
                SceneJson = req.SceneJson,
                CameraJson = req.CameraJson,
                Visibility = req.Visibility,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            var version = new GraphSceneVersion
            {
                Id = Guid.NewGuid(),
                SceneId = scene.Id,
                VersionNumber = 1,
                SceneJson = req.SceneJson,
                CameraJson = req.CameraJson,
                CreatedByUserId = user.Id,
                CreatedAtUtc = now
            };

            scene.Versions.Add(version);
            _db.GraphScenes.Add(scene);
            await _db.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(req.ThumbnailDataUrl))
            {
                var thumbnailPath = await _thumbnailStorage.SaveThumbnailAsync(scene.Id.ToString(), req.ThumbnailDataUrl);
                scene.ThumbnailPath = thumbnailPath;
                version.ThumbnailPath = thumbnailPath;
                await _db.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetById), new { id = scene.Id.ToString() }, new SceneSaveResponse
            {
                Id = scene.Id.ToString(),
                ThumbnailPath = scene.ThumbnailPath,
                Title = scene.Title,
                Description = scene.Description,
                UpdatedAtUtc = scene.UpdatedAtUtc
            });
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(string id, [FromBody] SaveSceneRequest req)
        {
            if (!Guid.TryParse(id, out var gid)) return NotFound();
            var scene = await _db.GraphScenes.Include(s => s.Versions).FirstOrDefaultAsync(s => s.Id == gid);
            if (scene == null) return NotFound();
            var user = await _users.GetUserAsync(User);
            if (user == null) return Unauthorized();
            if (scene.OwnerUserId != user.Id) return Forbid();

            var now = DateTime.UtcNow;
            // create new version
            var lastVersionNumber = scene.Versions.Any() ? scene.Versions.Max(v => v.VersionNumber) : 0;
            var newVersion = new GraphSceneVersion
            {
                Id = Guid.NewGuid(),
                SceneId = scene.Id,
                VersionNumber = lastVersionNumber + 1,
                SceneJson = req.SceneJson,
                CameraJson = req.CameraJson,
                CreatedByUserId = user.Id,
                CreatedAtUtc = now
            };
            scene.Versions.Add(newVersion);

            scene.Title = req.Title ?? scene.Title;
            scene.Description = req.Description ?? scene.Description;
            scene.SceneJson = req.SceneJson;
            scene.CameraJson = req.CameraJson;
            scene.Visibility = req.Visibility;
            scene.UpdatedAtUtc = now;

            _db.GraphSceneVersions.Add(newVersion);
            _db.GraphScenes.Update(scene);
            await _db.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(req.ThumbnailDataUrl))
            {
                var thumbnailPath = await _thumbnailStorage.SaveThumbnailAsync(scene.Id.ToString(), req.ThumbnailDataUrl, scene.ThumbnailPath);
                scene.ThumbnailPath = thumbnailPath;
                newVersion.ThumbnailPath = thumbnailPath;
                await _db.SaveChangesAsync();
            }

            return Ok(new SceneSaveResponse
            {
                Id = scene.Id.ToString(),
                ThumbnailPath = scene.ThumbnailPath,
                Title = scene.Title,
                Description = scene.Description,
                UpdatedAtUtc = scene.UpdatedAtUtc
            });
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(string id)
        {
            if (!Guid.TryParse(id, out var gid)) return NotFound();
            var scene = await _db.GraphScenes.Include(s => s.Versions).FirstOrDefaultAsync(s => s.Id == gid);
            if (scene == null) return NotFound();
            var user = await _users.GetUserAsync(User);
            if (user == null) return Unauthorized();
            if (scene.OwnerUserId != user.Id) return Forbid();

            _thumbnailStorage.DeleteThumbnail(scene.ThumbnailPath);
            foreach (var versionThumbnailPath in scene.Versions.Select(version => version.ThumbnailPath).Where(path => !string.IsNullOrWhiteSpace(path)).Distinct())
            {
                _thumbnailStorage.DeleteThumbnail(versionThumbnailPath);
            }
            _db.GraphScenes.Remove(scene);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
