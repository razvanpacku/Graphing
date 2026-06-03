using System;
using System.Collections.Generic;

namespace Graphing.Server.Models
{
    public class Comment
    {
        public Guid Id { get; set; }
        public Guid PostId { get; set; }
        public Post Post { get; set; } = null!;
        public string AuthorUserId { get; set; } = string.Empty;
        public ApplicationUser AuthorUser { get; set; } = null!;
        public Guid? ParentCommentId { get; set; }
        public Comment? ParentComment { get; set; }
        public ICollection<Comment> Replies { get; set; } = new List<Comment>();
        public string Body { get; set; } = string.Empty;
        public bool IsDeleted { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public string? ModeratedByUserId { get; set; }
        public ApplicationUser? ModeratedByUser { get; set; }
        public DateTime? ModeratedAtUtc { get; set; }
    }
}