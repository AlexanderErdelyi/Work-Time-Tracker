using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Timekeeper.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCopilotConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CopilotEnabled",
                table: "Workspaces",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "CopilotGitHubTokenProtected",
                table: "Workspaces",
                type: "TEXT",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 7, 24, 3, 143, DateTimeKind.Utc).AddTicks(7228));

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 7, 24, 3, 143, DateTimeKind.Utc).AddTicks(7228));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 7, 24, 3, 143, DateTimeKind.Utc).AddTicks(7228));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 7, 24, 3, 143, DateTimeKind.Utc).AddTicks(7228));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 7, 24, 3, 143, DateTimeKind.Utc).AddTicks(7228));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 7, 24, 3, 143, DateTimeKind.Utc).AddTicks(7228));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 7, 24, 3, 143, DateTimeKind.Utc).AddTicks(7228));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 7, 24, 3, 143, DateTimeKind.Utc).AddTicks(7228));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 7, 24, 3, 143, DateTimeKind.Utc).AddTicks(7228));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 7, 24, 3, 143, DateTimeKind.Utc).AddTicks(7228));

            migrationBuilder.UpdateData(
                table: "Workspaces",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CopilotEnabled", "CopilotGitHubTokenProtected", "CreatedAt" },
                values: new object[] { false, null, new DateTime(2026, 3, 3, 7, 24, 3, 143, DateTimeKind.Utc).AddTicks(7228) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CopilotEnabled",
                table: "Workspaces");

            migrationBuilder.DropColumn(
                name: "CopilotGitHubTokenProtected",
                table: "Workspaces");

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
        }
    }
}
