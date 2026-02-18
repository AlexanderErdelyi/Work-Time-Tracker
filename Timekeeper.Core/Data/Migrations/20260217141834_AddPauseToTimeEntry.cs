using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Timekeeper.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPauseToTimeEntry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PausedAt",
                table: "TimeEntries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalPausedSeconds",
                table: "TimeEntries",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PausedAt",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "TotalPausedSeconds",
                table: "TimeEntries");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 7, 16, 53, 157, DateTimeKind.Utc).AddTicks(1315));

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 7, 16, 53, 157, DateTimeKind.Utc).AddTicks(1315));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 7, 16, 53, 157, DateTimeKind.Utc).AddTicks(1315));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 7, 16, 53, 157, DateTimeKind.Utc).AddTicks(1315));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 7, 16, 53, 157, DateTimeKind.Utc).AddTicks(1315));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 7, 16, 53, 157, DateTimeKind.Utc).AddTicks(1315));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 7, 16, 53, 157, DateTimeKind.Utc).AddTicks(1315));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 7, 16, 53, 157, DateTimeKind.Utc).AddTicks(1315));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 17, 7, 16, 53, 157, DateTimeKind.Utc).AddTicks(1315));
        }
    }
}
