using Graphing.Server.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Graphing.Server.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<ApplicationUser> ApplicationUsers { get; set; }
        public DbSet<GraphScene> GraphScenes { get; set; }
        public DbSet<GraphSceneVersion> GraphSceneVersions { get; set; }
        public DbSet<Post> Posts { get; set; }
        public DbSet<PostLike> PostLikes { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<Report> Reports { get; set; }
        public DbSet<Ban> Bans { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            builder.Entity<ApplicationUser>().HasIndex(u => u.Name).IsUnique();

            builder.Entity<GraphScene>(entity =>
            {
                entity.HasKey(scene => scene.Id);
                entity.Property(scene => scene.Title).HasMaxLength(120);
                entity.Property(scene => scene.SceneJson).IsRequired();
                entity.Property(scene => scene.CameraJson).IsRequired();
                entity.Property(scene => scene.OwnerUserId).IsRequired();
                entity.HasOne(scene => scene.OwnerUser)
                    .WithMany(user => user.OwnedScenes)
                    .HasForeignKey(scene => scene.OwnerUserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(scene => scene.ForkedFromPost)
                    .WithMany()
                    .HasForeignKey(scene => scene.ForkedFromPostId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasOne(scene => scene.ForkedFromScene)
                    .WithMany()
                    .HasForeignKey(scene => scene.ForkedFromSceneId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasIndex(scene => new { scene.OwnerUserId, scene.UpdatedAtUtc });
            });

            builder.Entity<GraphSceneVersion>(entity =>
            {
                entity.HasKey(version => version.Id);
                entity.Property(version => version.SceneJson).IsRequired();
                entity.Property(version => version.CameraJson).IsRequired();
                entity.Property(version => version.CreatedByUserId).IsRequired();
                entity.HasOne(version => version.Scene)
                    .WithMany(scene => scene.Versions)
                    .HasForeignKey(version => version.SceneId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(version => version.CreatedByUser)
                    .WithMany(user => user.CreatedSceneVersions)
                    .HasForeignKey(version => version.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(version => new { version.SceneId, version.VersionNumber }).IsUnique();
            });

            builder.Entity<Post>(entity =>
            {
                entity.HasKey(post => post.Id);
                entity.Property(post => post.Title).HasMaxLength(120).IsRequired();
                entity.Property(post => post.AuthorUserId).IsRequired();
                entity.Property(post => post.SceneVersionId).IsRequired();
                entity.HasOne(post => post.SceneVersion)
                    .WithOne(version => version.PublishedPost)
                    .HasForeignKey<Post>(post => post.SceneVersionId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(post => post.AuthorUser)
                    .WithMany(user => user.AuthoredPosts)
                    .HasForeignKey(post => post.AuthorUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(post => post.ModeratedByUser)
                    .WithMany()
                    .HasForeignKey(post => post.ModeratedByUserId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasIndex(post => post.CreatedAtUtc);
                entity.HasIndex(post => post.SceneVersionId).IsUnique();
            });

            builder.Entity<PostLike>(entity =>
            {
                entity.HasKey(like => like.Id);
                entity.Property(like => like.UserId).IsRequired();
                entity.HasOne(like => like.Post)
                    .WithMany(post => post.Likes)
                    .HasForeignKey(like => like.PostId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(like => like.User)
                    .WithMany(user => user.PostLikes)
                    .HasForeignKey(like => like.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(like => new { like.PostId, like.UserId }).IsUnique();
            });

            builder.Entity<Comment>(entity =>
            {
                entity.HasKey(comment => comment.Id);
                entity.Property(comment => comment.Body).HasMaxLength(4000).IsRequired();
                entity.Property(comment => comment.AuthorUserId).IsRequired();
                entity.HasOne(comment => comment.Post)
                    .WithMany(post => post.Comments)
                    .HasForeignKey(comment => comment.PostId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(comment => comment.AuthorUser)
                    .WithMany(user => user.AuthoredComments)
                    .HasForeignKey(comment => comment.AuthorUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(comment => comment.ParentComment)
                    .WithMany(comment => comment.Replies)
                    .HasForeignKey(comment => comment.ParentCommentId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasOne(comment => comment.ModeratedByUser)
                    .WithMany()
                    .HasForeignKey(comment => comment.ModeratedByUserId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasIndex(comment => comment.PostId);
            });

            builder.Entity<Report>(entity =>
            {
                entity.HasKey(report => report.Id);
                entity.Property(report => report.ReporterUserId).IsRequired();
                entity.Property(report => report.TargetId).IsRequired();
                entity.Property(report => report.ReasonCode).HasMaxLength(64).IsRequired();
                entity.Property(report => report.Details).HasMaxLength(4000).IsRequired();
                entity.HasOne(report => report.ReporterUser)
                    .WithMany(user => user.SubmittedReports)
                    .HasForeignKey(report => report.ReporterUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(report => report.ReviewedByUser)
                    .WithMany(user => user.ReviewedReports)
                    .HasForeignKey(report => report.ReviewedByUserId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasIndex(report => new { report.TargetType, report.TargetId });
                entity.HasIndex(report => report.Status);
            });

            builder.Entity<Ban>(entity =>
            {
                entity.HasKey(ban => ban.Id);
                entity.Property(ban => ban.UserId).IsRequired();
                entity.Property(ban => ban.AdminUserId).IsRequired();
                entity.Property(ban => ban.Reason).HasMaxLength(1000).IsRequired();
                entity.HasOne(ban => ban.User)
                    .WithMany(user => user.CurrentBans)
                    .HasForeignKey(ban => ban.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(ban => ban.AdminUser)
                    .WithMany(user => user.IssuedBans)
                    .HasForeignKey(ban => ban.AdminUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(ban => ban.SourceReport)
                    .WithMany()
                    .HasForeignKey(ban => ban.SourceReportId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasIndex(ban => new { ban.UserId, ban.IsActive });
            });
        }
    }
}
