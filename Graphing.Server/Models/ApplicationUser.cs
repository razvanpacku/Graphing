using Microsoft.AspNetCore.Identity;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Graphing.Server.Models
{
    public class ApplicationUser : IdentityUser
    {
        [Required]
        [MinLength(5, ErrorMessage = "Username must have at least 5 chracters")]
        [MaxLength(31, ErrorMessage = "Username can have at most 31 characters")]
        public string Name { get; set; } = string.Empty;

        public bool isBanned { get; set; } = false;

        public ICollection<GraphScene> OwnedScenes { get; set; } = new List<GraphScene>();
        public ICollection<GraphSceneVersion> CreatedSceneVersions { get; set; } = new List<GraphSceneVersion>();
        public ICollection<Post> AuthoredPosts { get; set; } = new List<Post>();
        public ICollection<Comment> AuthoredComments { get; set; } = new List<Comment>();
        public ICollection<PostLike> PostLikes { get; set; } = new List<PostLike>();
        public ICollection<Report> SubmittedReports { get; set; } = new List<Report>();
        public ICollection<Report> ReviewedReports { get; set; } = new List<Report>();
        public ICollection<Ban> IssuedBans { get; set; } = new List<Ban>();
        public ICollection<Ban> CurrentBans { get; set; } = new List<Ban>();
    }
}
