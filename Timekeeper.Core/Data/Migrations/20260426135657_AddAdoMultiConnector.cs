using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Timekeeper.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAdoMultiConnector : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserIntegrations_WorkspaceId_UserId_Provider",
                table: "UserIntegrations");

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "UserIntegrations",
                type: "TEXT",
                maxLength: 100,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 26, 13, 56, 57, 201, DateTimeKind.Utc).AddTicks(1703));

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 26, 13, 56, 57, 201, DateTimeKind.Utc).AddTicks(1703));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 26, 13, 56, 57, 201, DateTimeKind.Utc).AddTicks(1703));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 26, 13, 56, 57, 201, DateTimeKind.Utc).AddTicks(1703));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 26, 13, 56, 57, 201, DateTimeKind.Utc).AddTicks(1703));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 26, 13, 56, 57, 201, DateTimeKind.Utc).AddTicks(1703));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 26, 13, 56, 57, 201, DateTimeKind.Utc).AddTicks(1703));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 26, 13, 56, 57, 201, DateTimeKind.Utc).AddTicks(1703));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 26, 13, 56, 57, 201, DateTimeKind.Utc).AddTicks(1703));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 26, 13, 56, 57, 201, DateTimeKind.Utc).AddTicks(1703));

            migrationBuilder.UpdateData(
                table: "Workspaces",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 4, 26, 13, 56, 57, 201, DateTimeKind.Utc).AddTicks(1703));

            migrationBuilder.CreateIndex(
                name: "IX_UserIntegrations_WorkspaceId_UserId_Provider",
                table: "UserIntegrations",
                columns: new[] { "WorkspaceId", "UserId", "Provider" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserIntegrations_WorkspaceId_UserId_Provider",
                table: "UserIntegrations");

            migrationBuilder.DropColumn(
                name: "DisplayName",
                table: "UserIntegrations");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 12, 8, 2, 706, DateTimeKind.Utc).AddTicks(1936));

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 12, 8, 2, 706, DateTimeKind.Utc).AddTicks(1936));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 12, 8, 2, 706, DateTimeKind.Utc).AddTicks(1936));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 12, 8, 2, 706, DateTimeKind.Utc).AddTicks(1936));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 12, 8, 2, 706, DateTimeKind.Utc).AddTicks(1936));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 12, 8, 2, 706, DateTimeKind.Utc).AddTicks(1936));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 12, 8, 2, 706, DateTimeKind.Utc).AddTicks(1936));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 12, 8, 2, 706, DateTimeKind.Utc).AddTicks(1936));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 12, 8, 2, 706, DateTimeKind.Utc).AddTicks(1936));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 12, 8, 2, 706, DateTimeKind.Utc).AddTicks(1936));

            migrationBuilder.UpdateData(
                table: "Workspaces",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 12, 8, 2, 706, DateTimeKind.Utc).AddTicks(1936));

            migrationBuilder.CreateIndex(
                name: "IX_UserIntegrations_WorkspaceId_UserId_Provider",
                table: "UserIntegrations",
                columns: new[] { "WorkspaceId", "UserId", "Provider" },
                unique: true);
        }
    }
}
