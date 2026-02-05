using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Timekeeper.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNewFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Position",
                table: "Tasks",
                type: "TEXT",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProcurementNumber",
                table: "Tasks",
                type: "TEXT",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "No",
                table: "Projects",
                type: "TEXT",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "No",
                table: "Customers",
                type: "TEXT",
                maxLength: 20,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "No" },
                values: new object[] { new DateTime(2026, 2, 5, 6, 7, 44, 100, DateTimeKind.Utc).AddTicks(913), null });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "No" },
                values: new object[] { new DateTime(2026, 2, 5, 6, 7, 44, 100, DateTimeKind.Utc).AddTicks(913), null });

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "No" },
                values: new object[] { new DateTime(2026, 2, 5, 6, 7, 44, 100, DateTimeKind.Utc).AddTicks(913), null });

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "No" },
                values: new object[] { new DateTime(2026, 2, 5, 6, 7, 44, 100, DateTimeKind.Utc).AddTicks(913), null });

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "No" },
                values: new object[] { new DateTime(2026, 2, 5, 6, 7, 44, 100, DateTimeKind.Utc).AddTicks(913), null });

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "Position", "ProcurementNumber" },
                values: new object[] { new DateTime(2026, 2, 5, 6, 7, 44, 100, DateTimeKind.Utc).AddTicks(913), null, null });

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "Position", "ProcurementNumber" },
                values: new object[] { new DateTime(2026, 2, 5, 6, 7, 44, 100, DateTimeKind.Utc).AddTicks(913), null, null });

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "Position", "ProcurementNumber" },
                values: new object[] { new DateTime(2026, 2, 5, 6, 7, 44, 100, DateTimeKind.Utc).AddTicks(913), null, null });

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "CreatedAt", "Position", "ProcurementNumber" },
                values: new object[] { new DateTime(2026, 2, 5, 6, 7, 44, 100, DateTimeKind.Utc).AddTicks(913), null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Position",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "ProcurementNumber",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "No",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "No",
                table: "Customers");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 4, 20, 0, 40, 759, DateTimeKind.Utc).AddTicks(1847));

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 4, 20, 0, 40, 759, DateTimeKind.Utc).AddTicks(1847));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 4, 20, 0, 40, 759, DateTimeKind.Utc).AddTicks(1847));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 4, 20, 0, 40, 759, DateTimeKind.Utc).AddTicks(1847));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 4, 20, 0, 40, 759, DateTimeKind.Utc).AddTicks(1847));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 4, 20, 0, 40, 759, DateTimeKind.Utc).AddTicks(1847));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 4, 20, 0, 40, 759, DateTimeKind.Utc).AddTicks(1847));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 4, 20, 0, 40, 759, DateTimeKind.Utc).AddTicks(1847));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 4, 20, 0, 40, 759, DateTimeKind.Utc).AddTicks(1847));
        }
    }
}
