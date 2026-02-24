using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Timekeeper.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserOwnershipIsolation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "WorkDays",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "TimeEntries",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 23, 22, 22, 808, DateTimeKind.Utc).AddTicks(2285));

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 23, 22, 22, 808, DateTimeKind.Utc).AddTicks(2285));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 23, 22, 22, 808, DateTimeKind.Utc).AddTicks(2285));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 23, 22, 22, 808, DateTimeKind.Utc).AddTicks(2285));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 23, 22, 22, 808, DateTimeKind.Utc).AddTicks(2285));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 23, 22, 22, 808, DateTimeKind.Utc).AddTicks(2285));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 23, 22, 22, 808, DateTimeKind.Utc).AddTicks(2285));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 23, 22, 22, 808, DateTimeKind.Utc).AddTicks(2285));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 23, 22, 22, 808, DateTimeKind.Utc).AddTicks(2285));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 23, 22, 22, 808, DateTimeKind.Utc).AddTicks(2285));

            migrationBuilder.UpdateData(
                table: "Workspaces",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 23, 22, 22, 808, DateTimeKind.Utc).AddTicks(2285));

            migrationBuilder.CreateIndex(
                name: "IX_WorkDays_UserId",
                table: "WorkDays",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkDays_WorkspaceId_UserId_Date",
                table: "WorkDays",
                columns: new[] { "WorkspaceId", "UserId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_UserId",
                table: "TimeEntries",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_WorkspaceId_UserId_StartTime",
                table: "TimeEntries",
                columns: new[] { "WorkspaceId", "UserId", "StartTime" });

            migrationBuilder.AddForeignKey(
                name: "FK_TimeEntries_Users_UserId",
                table: "TimeEntries",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkDays_Users_UserId",
                table: "WorkDays",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimeEntries_Users_UserId",
                table: "TimeEntries");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkDays_Users_UserId",
                table: "WorkDays");

            migrationBuilder.DropIndex(
                name: "IX_WorkDays_UserId",
                table: "WorkDays");

            migrationBuilder.DropIndex(
                name: "IX_WorkDays_WorkspaceId_UserId_Date",
                table: "WorkDays");

            migrationBuilder.DropIndex(
                name: "IX_TimeEntries_UserId",
                table: "TimeEntries");

            migrationBuilder.DropIndex(
                name: "IX_TimeEntries_WorkspaceId_UserId_StartTime",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "WorkDays");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "TimeEntries");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 49, 31, 431, DateTimeKind.Utc).AddTicks(1021));

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 49, 31, 431, DateTimeKind.Utc).AddTicks(1021));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 49, 31, 431, DateTimeKind.Utc).AddTicks(1021));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 49, 31, 431, DateTimeKind.Utc).AddTicks(1021));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 49, 31, 431, DateTimeKind.Utc).AddTicks(1021));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 49, 31, 431, DateTimeKind.Utc).AddTicks(1021));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 49, 31, 431, DateTimeKind.Utc).AddTicks(1021));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 49, 31, 431, DateTimeKind.Utc).AddTicks(1021));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 49, 31, 431, DateTimeKind.Utc).AddTicks(1021));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 49, 31, 431, DateTimeKind.Utc).AddTicks(1021));

            migrationBuilder.UpdateData(
                table: "Workspaces",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 49, 31, 431, DateTimeKind.Utc).AddTicks(1021));
        }
    }
}
