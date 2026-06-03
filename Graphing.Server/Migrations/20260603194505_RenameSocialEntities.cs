using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Graphing.Server.Migrations
{
    /// <inheritdoc />
    public partial class RenameSocialEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GraphScenes_GraphPosts_ForkedFromPostId",
                table: "GraphScenes");

            migrationBuilder.RenameTable(
                name: "GraphPosts",
                newName: "Posts");

            migrationBuilder.RenameTable(
                name: "GraphReports",
                newName: "Reports");

            migrationBuilder.RenameTable(
                name: "GraphComments",
                newName: "Comments");

            migrationBuilder.RenameTable(
                name: "GraphPostLikes",
                newName: "PostLikes");

            migrationBuilder.RenameTable(
                name: "UserBans",
                newName: "Bans");

            migrationBuilder.RenameIndex(
                name: "IX_GraphComments_AuthorUserId",
                table: "Comments",
                newName: "IX_Comments_AuthorUserId");

            migrationBuilder.RenameIndex(
                name: "IX_GraphComments_ModeratedByUserId",
                table: "Comments",
                newName: "IX_Comments_ModeratedByUserId");

            migrationBuilder.RenameIndex(
                name: "IX_GraphComments_ParentCommentId",
                table: "Comments",
                newName: "IX_Comments_ParentCommentId");

            migrationBuilder.RenameIndex(
                name: "IX_GraphComments_PostId",
                table: "Comments",
                newName: "IX_Comments_PostId");

            migrationBuilder.RenameIndex(
                name: "IX_GraphPostLikes_PostId_UserId",
                table: "PostLikes",
                newName: "IX_PostLikes_PostId_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_GraphPostLikes_UserId",
                table: "PostLikes",
                newName: "IX_PostLikes_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_GraphPosts_AuthorUserId",
                table: "Posts",
                newName: "IX_Posts_AuthorUserId");

            migrationBuilder.RenameIndex(
                name: "IX_GraphPosts_CreatedAtUtc",
                table: "Posts",
                newName: "IX_Posts_CreatedAtUtc");

            migrationBuilder.RenameIndex(
                name: "IX_GraphPosts_ModeratedByUserId",
                table: "Posts",
                newName: "IX_Posts_ModeratedByUserId");

            migrationBuilder.RenameIndex(
                name: "IX_GraphPosts_SceneVersionId",
                table: "Posts",
                newName: "IX_Posts_SceneVersionId");

            migrationBuilder.RenameIndex(
                name: "IX_GraphReports_ReporterUserId",
                table: "Reports",
                newName: "IX_Reports_ReporterUserId");

            migrationBuilder.RenameIndex(
                name: "IX_GraphReports_ReviewedByUserId",
                table: "Reports",
                newName: "IX_Reports_ReviewedByUserId");

            migrationBuilder.RenameIndex(
                name: "IX_GraphReports_Status",
                table: "Reports",
                newName: "IX_Reports_Status");

            migrationBuilder.RenameIndex(
                name: "IX_GraphReports_TargetType_TargetId",
                table: "Reports",
                newName: "IX_Reports_TargetType_TargetId");

            migrationBuilder.RenameIndex(
                name: "IX_UserBans_AdminUserId",
                table: "Bans",
                newName: "IX_Bans_AdminUserId");

            migrationBuilder.RenameIndex(
                name: "IX_UserBans_SourceReportId",
                table: "Bans",
                newName: "IX_Bans_SourceReportId");

            migrationBuilder.RenameIndex(
                name: "IX_UserBans_UserId_IsActive",
                table: "Bans",
                newName: "IX_Bans_UserId_IsActive");

            migrationBuilder.AddForeignKey(
                name: "FK_GraphScenes_Posts_ForkedFromPostId",
                table: "GraphScenes",
                column: "ForkedFromPostId",
                principalTable: "Posts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GraphScenes_Posts_ForkedFromPostId",
                table: "GraphScenes");

            migrationBuilder.RenameTable(
                name: "Bans",
                newName: "UserBans");

            migrationBuilder.RenameTable(
                name: "Comments",
                newName: "GraphComments");

            migrationBuilder.RenameTable(
                name: "PostLikes",
                newName: "GraphPostLikes");

            migrationBuilder.RenameTable(
                name: "Reports",
                newName: "GraphReports");

            migrationBuilder.RenameTable(
                name: "Posts",
                newName: "GraphPosts");

            migrationBuilder.RenameIndex(
                name: "IX_Bans_AdminUserId",
                table: "UserBans",
                newName: "IX_UserBans_AdminUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Bans_SourceReportId",
                table: "UserBans",
                newName: "IX_UserBans_SourceReportId");

            migrationBuilder.RenameIndex(
                name: "IX_Bans_UserId_IsActive",
                table: "UserBans",
                newName: "IX_UserBans_UserId_IsActive");

            migrationBuilder.RenameIndex(
                name: "IX_Comments_AuthorUserId",
                table: "GraphComments",
                newName: "IX_GraphComments_AuthorUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Comments_ModeratedByUserId",
                table: "GraphComments",
                newName: "IX_GraphComments_ModeratedByUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Comments_ParentCommentId",
                table: "GraphComments",
                newName: "IX_GraphComments_ParentCommentId");

            migrationBuilder.RenameIndex(
                name: "IX_Comments_PostId",
                table: "GraphComments",
                newName: "IX_GraphComments_PostId");

            migrationBuilder.RenameIndex(
                name: "IX_PostLikes_PostId_UserId",
                table: "GraphPostLikes",
                newName: "IX_GraphPostLikes_PostId_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_PostLikes_UserId",
                table: "GraphPostLikes",
                newName: "IX_GraphPostLikes_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Posts_AuthorUserId",
                table: "GraphPosts",
                newName: "IX_GraphPosts_AuthorUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Posts_CreatedAtUtc",
                table: "GraphPosts",
                newName: "IX_GraphPosts_CreatedAtUtc");

            migrationBuilder.RenameIndex(
                name: "IX_Posts_ModeratedByUserId",
                table: "GraphPosts",
                newName: "IX_GraphPosts_ModeratedByUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Posts_SceneVersionId",
                table: "GraphPosts",
                newName: "IX_GraphPosts_SceneVersionId");

            migrationBuilder.RenameIndex(
                name: "IX_Reports_ReporterUserId",
                table: "GraphReports",
                newName: "IX_GraphReports_ReporterUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Reports_ReviewedByUserId",
                table: "GraphReports",
                newName: "IX_GraphReports_ReviewedByUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Reports_Status",
                table: "GraphReports",
                newName: "IX_GraphReports_Status");

            migrationBuilder.RenameIndex(
                name: "IX_Reports_TargetType_TargetId",
                table: "GraphReports",
                newName: "IX_GraphReports_TargetType_TargetId");

            migrationBuilder.AddForeignKey(
                name: "FK_GraphScenes_GraphPosts_ForkedFromPostId",
                table: "GraphScenes",
                column: "ForkedFromPostId",
                principalTable: "GraphPosts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
