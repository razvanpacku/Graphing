using System;
using System.Collections.Generic;

namespace Graphing.Server.Models
{
    public class Post
    {
        public Guid Id { get; set; }
        public Guid SceneVersionId { get; set; }
        public GraphSceneVersion SceneVersion { get; set; } = null!;
        public string AuthorUserId { get; set; } = string.Empty;
        public ApplicationUser AuthorUser { get; set; } = null!;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ThumbnailPath { get; set; }
        public int? ThumbnailWidth { get; set; }
        public int? ThumbnailHeight { get; set; }
        public PostStatus Status { get; set; } = PostStatus.Active;
        public int LikeCount { get; set; }
        public int CommentCount { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
        public string? ModeratedByUserId { get; set; }
        public ApplicationUser? ModeratedByUser { get; set; }
        public DateTime? ModeratedAtUtc { get; set; }

        public ICollection<Comment> Comments { get; set; } = new List<Comment>();
        public ICollection<PostLike> Likes { get; set; } = new List<PostLike>();
    }
}