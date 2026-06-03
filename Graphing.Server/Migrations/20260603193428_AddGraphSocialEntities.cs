using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Graphing.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddGraphSocialEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GraphReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ReporterUserId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetType = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetId = table.Column<string>(type: "TEXT", nullable: false),
                    ReasonCode = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Details = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    ReviewedByUserId = table.Column<string>(type: "TEXT", nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ResolutionNotes = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GraphReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GraphReports_AspNetUsers_ReporterUserId",
                        column: x => x.ReporterUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GraphReports_AspNetUsers_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "UserBans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    AdminUserId = table.Column<string>(type: "TEXT", nullable: false),
                    SourceReportId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Reason = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    StartedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndsAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserBans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserBans_AspNetUsers_AdminUserId",
                        column: x => x.AdminUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserBans_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserBans_GraphReports_SourceReportId",
                        column: x => x.SourceReportId,
                        principalTable: "GraphReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "GraphComments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PostId = table.Column<Guid>(type: "TEXT", nullable: false),
                    AuthorUserId = table.Column<string>(type: "TEXT", nullable: false),
                    ParentCommentId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Body = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModeratedByUserId = table.Column<string>(type: "TEXT", nullable: true),
                    ModeratedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GraphComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GraphComments_AspNetUsers_AuthorUserId",
                        column: x => x.AuthorUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GraphComments_AspNetUsers_ModeratedByUserId",
                        column: x => x.ModeratedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_GraphComments_GraphComments_ParentCommentId",
                        column: x => x.ParentCommentId,
                        principalTable: "GraphComments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "GraphPostLikes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PostId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GraphPostLikes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GraphPostLikes_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GraphPosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SceneVersionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    AuthorUserId = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    ThumbnailPath = table.Column<string>(type: "TEXT", nullable: true),
                    ThumbnailWidth = table.Column<int>(type: "INTEGER", nullable: true),
                    ThumbnailHeight = table.Column<int>(type: "INTEGER", nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    LikeCount = table.Column<int>(type: "INTEGER", nullable: false),
                    CommentCount = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ModeratedByUserId = table.Column<string>(type: "TEXT", nullable: true),
                    ModeratedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GraphPosts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GraphPosts_AspNetUsers_AuthorUserId",
                        column: x => x.AuthorUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GraphPosts_AspNetUsers_ModeratedByUserId",
                        column: x => x.ModeratedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "GraphScenes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OwnerUserId = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    SceneJson = table.Column<string>(type: "TEXT", nullable: false),
                    CameraJson = table.Column<string>(type: "TEXT", nullable: false),
                    ThumbnailPath = table.Column<string>(type: "TEXT", nullable: true),
                    ThumbnailWidth = table.Column<int>(type: "INTEGER", nullable: true),
                    ThumbnailHeight = table.Column<int>(type: "INTEGER", nullable: true),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false),
                    IsArchived = table.Column<bool>(type: "INTEGER", nullable: false),
                    ForkedFromPostId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ForkedFromSceneId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GraphScenes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GraphScenes_AspNetUsers_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GraphScenes_GraphPosts_ForkedFromPostId",
                        column: x => x.ForkedFromPostId,
                        principalTable: "GraphPosts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_GraphScenes_GraphScenes_ForkedFromSceneId",
                        column: x => x.ForkedFromSceneId,
                        principalTable: "GraphScenes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "GraphSceneVersions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SceneId = table.Column<Guid>(type: "TEXT", nullable: false),
                    VersionNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    SceneJson = table.Column<string>(type: "TEXT", nullable: false),
                    CameraJson = table.Column<string>(type: "TEXT", nullable: false),
                    ThumbnailPath = table.Column<string>(type: "TEXT", nullable: true),
                    ThumbnailWidth = table.Column<int>(type: "INTEGER", nullable: true),
                    ThumbnailHeight = table.Column<int>(type: "INTEGER", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GraphSceneVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GraphSceneVersions_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GraphSceneVersions_GraphScenes_SceneId",
                        column: x => x.SceneId,
                        principalTable: "GraphScenes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GraphComments_AuthorUserId",
                table: "GraphComments",
                column: "AuthorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphComments_ModeratedByUserId",
                table: "GraphComments",
                column: "ModeratedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphComments_ParentCommentId",
                table: "GraphComments",
                column: "ParentCommentId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphComments_PostId",
                table: "GraphComments",
                column: "PostId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphPostLikes_PostId_UserId",
                table: "GraphPostLikes",
                columns: new[] { "PostId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GraphPostLikes_UserId",
                table: "GraphPostLikes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphPosts_AuthorUserId",
                table: "GraphPosts",
                column: "AuthorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphPosts_CreatedAtUtc",
                table: "GraphPosts",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_GraphPosts_ModeratedByUserId",
                table: "GraphPosts",
                column: "ModeratedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphPosts_SceneVersionId",
                table: "GraphPosts",
                column: "SceneVersionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GraphReports_ReporterUserId",
                table: "GraphReports",
                column: "ReporterUserId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphReports_ReviewedByUserId",
                table: "GraphReports",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphReports_Status",
                table: "GraphReports",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_GraphReports_TargetType_TargetId",
                table: "GraphReports",
                columns: new[] { "TargetType", "TargetId" });

            migrationBuilder.CreateIndex(
                name: "IX_GraphScenes_ForkedFromPostId",
                table: "GraphScenes",
                column: "ForkedFromPostId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphScenes_ForkedFromSceneId",
                table: "GraphScenes",
                column: "ForkedFromSceneId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphScenes_OwnerUserId_UpdatedAtUtc",
                table: "GraphScenes",
                columns: new[] { "OwnerUserId", "UpdatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_GraphSceneVersions_CreatedByUserId",
                table: "GraphSceneVersions",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_GraphSceneVersions_SceneId_VersionNumber",
                table: "GraphSceneVersions",
                columns: new[] { "SceneId", "VersionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserBans_AdminUserId",
                table: "UserBans",
                column: "AdminUserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserBans_SourceReportId",
                table: "UserBans",
                column: "SourceReportId");

            migrationBuilder.CreateIndex(
                name: "IX_UserBans_UserId_IsActive",
                table: "UserBans",
                columns: new[] { "UserId", "IsActive" });

            migrationBuilder.AddForeignKey(
                name: "FK_GraphComments_GraphPosts_PostId",
                table: "GraphComments",
                column: "PostId",
                principalTable: "GraphPosts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GraphPostLikes_GraphPosts_PostId",
                table: "GraphPostLikes",
                column: "PostId",
                principalTable: "GraphPosts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GraphPosts_GraphSceneVersions_SceneVersionId",
                table: "GraphPosts",
                column: "SceneVersionId",
                principalTable: "GraphSceneVersions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GraphScenes_GraphPosts_ForkedFromPostId",
                table: "GraphScenes");

            migrationBuilder.DropTable(
                name: "GraphComments");

            migrationBuilder.DropTable(
                name: "GraphPostLikes");

            migrationBuilder.DropTable(
                name: "UserBans");

            migrationBuilder.DropTable(
                name: "GraphReports");

            migrationBuilder.DropTable(
                name: "GraphPosts");

            migrationBuilder.DropTable(
                name: "GraphSceneVersions");

            migrationBuilder.DropTable(
                name: "GraphScenes");
        }
    }
}
