using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Graphing.Server.Migrations
{
    public partial class AddReportTargetPostId : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TargetPostId",
                table: "Reports",
                type: "TEXT",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE Reports
                SET TargetPostId = TargetId
                WHERE TargetType = 0 AND TargetPostId IS NULL;
            ");

            migrationBuilder.Sql(@"
                UPDATE Reports
                SET TargetPostId = (
                    SELECT PostId
                    FROM Comments
                    WHERE Comments.Id = Reports.TargetId
                )
                WHERE TargetType = 1 AND TargetPostId IS NULL;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TargetPostId",
                table: "Reports");
        }
    }
}