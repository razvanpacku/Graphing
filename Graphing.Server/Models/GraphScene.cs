using System;
using System.Collections.Generic;

namespace Graphing.Server.Models
{
    public class GraphScene
    {
        public Guid Id { get; set; }
        public string OwnerUserId { get; set; } = string.Empty;
        public ApplicationUser OwnerUser { get; set; } = null!;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string SceneJson { get; set; } = string.Empty;
        public string CameraJson { get; set; } = string.Empty;
        public string? ThumbnailPath { get; set; }
        public int? ThumbnailWidth { get; set; }
        public int? ThumbnailHeight { get; set; }
        public SceneVisibility Visibility { get; set; } = SceneVisibility.Private;
        public bool IsArchived { get; set; }
        public Guid? ForkedFromPostId { get; set; }
        public Post? ForkedFromPost { get; set; }
        public Guid? ForkedFromSceneId { get; set; }
        public GraphScene? ForkedFromScene { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }

        public ICollection<GraphSceneVersion> Versions { get; set; } = new List<GraphSceneVersion>();
    }
}