using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Timekeeper.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkspaceAndAuthFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WorkspaceId",
                table: "WorkDays",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "WorkspaceId",
                table: "TimeEntries",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "WorkspaceId",
                table: "Tasks",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "WorkspaceId",
                table: "QuickActions",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "WorkspaceId",
                table: "Projects",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "WorkspaceId",
                table: "Customers",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "WorkspaceId",
                table: "Breaks",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "Workspaces",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Workspaces", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DisplayName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 320, nullable: false),
                    Role = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    WorkspaceId = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Workspaces_WorkspaceId",
                        column: x => x.WorkspaceId,
                        principalTable: "Workspaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "WorkspaceId" },
                values: new object[] { new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685), 1 });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "WorkspaceId" },
                values: new object[] { new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685), 1 });

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "WorkspaceId" },
                values: new object[] { new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685), 1 });

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "WorkspaceId" },
                values: new object[] { new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685), 1 });

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "WorkspaceId" },
                values: new object[] { new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685), 1 });

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "WorkspaceId" },
                values: new object[] { new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685), 1 });

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "WorkspaceId" },
                values: new object[] { new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685), 1 });

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "WorkspaceId" },
                values: new object[] { new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685), 1 });

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "CreatedAt", "WorkspaceId" },
                values: new object[] { new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685), 1 });

            migrationBuilder.InsertData(
                table: "Workspaces",
                columns: new[] { "Id", "CreatedAt", "IsActive", "Name", "UpdatedAt" },
                values: new object[] { 1, new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685), true, "Default Workspace", null });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedAt", "DisplayName", "Email", "IsActive", "Role", "UpdatedAt", "WorkspaceId" },
                values: new object[] { 1, new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685), "Local Admin", "admin@local.timekeeper", true, "Admin", null, 1 });

            migrationBuilder.CreateIndex(
                name: "IX_WorkDays_WorkspaceId_Date",
                table: "WorkDays",
                columns: new[] { "WorkspaceId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_WorkspaceId_StartTime",
                table: "TimeEntries",
                columns: new[] { "WorkspaceId", "StartTime" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_WorkspaceId_Name",
                table: "Tasks",
                columns: new[] { "WorkspaceId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_QuickActions_WorkspaceId_SortOrder",
                table: "QuickActions",
                columns: new[] { "WorkspaceId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_WorkspaceId_Name",
                table: "Projects",
                columns: new[] { "WorkspaceId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_Customers_WorkspaceId_Name",
                table: "Customers",
                columns: new[] { "WorkspaceId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_Breaks_WorkspaceId_StartTime",
                table: "Breaks",
                columns: new[] { "WorkspaceId", "StartTime" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_WorkspaceId",
                table: "Users",
                column: "WorkspaceId");

            migrationBuilder.CreateIndex(
                name: "IX_Workspaces_Name",
                table: "Workspaces",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Breaks_Workspaces_WorkspaceId",
                table: "Breaks",
                column: "WorkspaceId",
                principalTable: "Workspaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Customers_Workspaces_WorkspaceId",
                table: "Customers",
                column: "WorkspaceId",
                principalTable: "Workspaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Workspaces_WorkspaceId",
                table: "Projects",
                column: "WorkspaceId",
                principalTable: "Workspaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_QuickActions_Workspaces_WorkspaceId",
                table: "QuickActions",
                column: "WorkspaceId",
                principalTable: "Workspaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Workspaces_WorkspaceId",
                table: "Tasks",
                column: "WorkspaceId",
                principalTable: "Workspaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TimeEntries_Workspaces_WorkspaceId",
                table: "TimeEntries",
                column: "WorkspaceId",
                principalTable: "Workspaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkDays_Workspaces_WorkspaceId",
                table: "WorkDays",
                column: "WorkspaceId",
                principalTable: "Workspaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Breaks_Workspaces_WorkspaceId",
                table: "Breaks");

            migrationBuilder.DropForeignKey(
                name: "FK_Customers_Workspaces_WorkspaceId",
                table: "Customers");

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Workspaces_WorkspaceId",
                table: "Projects");

            migrationBuilder.DropForeignKey(
                name: "FK_QuickActions_Workspaces_WorkspaceId",
                table: "QuickActions");

            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Workspaces_WorkspaceId",
                table: "Tasks");

            migrationBuilder.DropForeignKey(
                name: "FK_TimeEntries_Workspaces_WorkspaceId",
                table: "TimeEntries");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkDays_Workspaces_WorkspaceId",
                table: "WorkDays");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Workspaces");

            migrationBuilder.DropIndex(
                name: "IX_WorkDays_WorkspaceId_Date",
                table: "WorkDays");

            migrationBuilder.DropIndex(
                name: "IX_TimeEntries_WorkspaceId_StartTime",
                table: "TimeEntries");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_WorkspaceId_Name",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_QuickActions_WorkspaceId_SortOrder",
                table: "QuickActions");

            migrationBuilder.DropIndex(
                name: "IX_Projects_WorkspaceId_Name",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Customers_WorkspaceId_Name",
                table: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_Breaks_WorkspaceId_StartTime",
                table: "Breaks");

            migrationBuilder.DropColumn(
                name: "WorkspaceId",
                table: "WorkDays");

            migrationBuilder.DropColumn(
                name: "WorkspaceId",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "WorkspaceId",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "WorkspaceId",
                table: "QuickActions");

            migrationBuilder.DropColumn(
                name: "WorkspaceId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "WorkspaceId",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "WorkspaceId",
                table: "Breaks");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 14, 18, 34, 96, DateTimeKind.Utc).AddTicks(824));

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 14, 18, 34, 96, DateTimeKind.Utc).AddTicks(824));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 14, 18, 34, 96, DateTimeKind.Utc).AddTicks(824));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 14, 18, 34, 96, DateTimeKind.Utc).AddTicks(824));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 14, 18, 34, 96, DateTimeKind.Utc).AddTicks(824));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 14, 18, 34, 96, DateTimeKind.Utc).AddTicks(824));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 14, 18, 34, 96, DateTimeKind.Utc).AddTicks(824));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 14, 18, 34, 96, DateTimeKind.Utc).AddTicks(824));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 14, 18, 34, 96, DateTimeKind.Utc).AddTicks(824));
        }
    }
}
