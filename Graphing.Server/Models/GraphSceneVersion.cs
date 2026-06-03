using System;

namespace Graphing.Server.Models
{
    public class GraphSceneVersion
    {
        public Guid Id { get; set; }
        public Guid SceneId { get; set; }
        public GraphScene Scene { get; set; } = null!;
        public int VersionNumber { get; set; }
        public string SceneJson { get; set; } = string.Empty;
        public string CameraJson { get; set; } = string.Empty;
        public string? ThumbnailPath { get; set; }
        public int? ThumbnailWidth { get; set; }
        public int? ThumbnailHeight { get; set; }
        public string CreatedByUserId { get; set; } = string.Empty;
        public ApplicationUser CreatedByUser { get; set; } = null!;
        public DateTime CreatedAtUtc { get; set; }

        public Post? PublishedPost { get; set; }
    }
}