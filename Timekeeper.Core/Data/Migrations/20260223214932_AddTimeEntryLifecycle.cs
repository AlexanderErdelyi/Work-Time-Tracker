using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Timekeeper.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTimeEntryLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "TimeEntries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ApprovedByUserId",
                table: "TimeEntries",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LockedAt",
                table: "TimeEntries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LockedByUserId",
                table: "TimeEntries",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RejectedAt",
                table: "TimeEntries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RejectedByUserId",
                table: "TimeEntries",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "TimeEntries",
                type: "TEXT",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "TimeEntries",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                defaultValue: "Draft");

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmittedAt",
                table: "TimeEntries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SubmittedByUserId",
                table: "TimeEntries",
                type: "INTEGER",
                nullable: true);

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "LockedAt",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "LockedByUserId",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "RejectedAt",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "RejectedByUserId",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "SubmittedAt",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "SubmittedByUserId",
                table: "TimeEntries");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685));

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685));

            migrationBuilder.UpdateData(
                table: "Workspaces",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 23, 21, 20, 5, 311, DateTimeKind.Utc).AddTicks(8685));
        }
    }
}
