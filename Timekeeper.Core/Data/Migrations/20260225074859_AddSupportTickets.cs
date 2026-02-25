using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Timekeeper.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSupportTickets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SupportTickets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    WorkspaceId = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    CreatedByUserId = table.Column<int>(type: "INTEGER", nullable: true),
                    CreatedByEmail = table.Column<string>(type: "TEXT", maxLength: 320, nullable: false),
                    SupportRepositoryOwner = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    SupportRepositoryRepo = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    IssueNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    IssueUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    Severity = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    GitHubState = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    LastCommentAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastIssueUpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastSyncedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastViewedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    HasUnreadUpdates = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupportTickets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupportTickets_Workspaces_WorkspaceId",
                        column: x => x.WorkspaceId,
                        principalTable: "Workspaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 48, 59, 70, DateTimeKind.Utc).AddTicks(3892));

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 48, 59, 70, DateTimeKind.Utc).AddTicks(3892));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 48, 59, 70, DateTimeKind.Utc).AddTicks(3892));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 48, 59, 70, DateTimeKind.Utc).AddTicks(3892));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 48, 59, 70, DateTimeKind.Utc).AddTicks(3892));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 48, 59, 70, DateTimeKind.Utc).AddTicks(3892));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 48, 59, 70, DateTimeKind.Utc).AddTicks(3892));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 48, 59, 70, DateTimeKind.Utc).AddTicks(3892));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 48, 59, 70, DateTimeKind.Utc).AddTicks(3892));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 48, 59, 70, DateTimeKind.Utc).AddTicks(3892));

            migrationBuilder.UpdateData(
                table: "Workspaces",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 48, 59, 70, DateTimeKind.Utc).AddTicks(3892));

            migrationBuilder.CreateIndex(
                name: "IX_SupportTickets_WorkspaceId_CreatedByEmail_CreatedAt",
                table: "SupportTickets",
                columns: new[] { "WorkspaceId", "CreatedByEmail", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SupportTickets_WorkspaceId_IssueNumber",
                table: "SupportTickets",
                columns: new[] { "WorkspaceId", "IssueNumber" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SupportTickets");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 17, 38, 383, DateTimeKind.Utc).AddTicks(3722));

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 17, 38, 383, DateTimeKind.Utc).AddTicks(3722));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 17, 38, 383, DateTimeKind.Utc).AddTicks(3722));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 17, 38, 383, DateTimeKind.Utc).AddTicks(3722));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 17, 38, 383, DateTimeKind.Utc).AddTicks(3722));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 17, 38, 383, DateTimeKind.Utc).AddTicks(3722));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 17, 38, 383, DateTimeKind.Utc).AddTicks(3722));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 17, 38, 383, DateTimeKind.Utc).AddTicks(3722));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 17, 38, 383, DateTimeKind.Utc).AddTicks(3722));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 17, 38, 383, DateTimeKind.Utc).AddTicks(3722));

            migrationBuilder.UpdateData(
                table: "Workspaces",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 25, 7, 17, 38, 383, DateTimeKind.Utc).AddTicks(3722));
        }
    }
}
