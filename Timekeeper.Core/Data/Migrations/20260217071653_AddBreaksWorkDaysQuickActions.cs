using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Timekeeper.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBreaksWorkDaysQuickActions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WorkDayId",
                table: "TimeEntries",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "QuickActions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Icon = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    ActionType = table.Column<int>(type: "INTEGER", nullable: false),
                    TaskId = table.Column<int>(type: "INTEGER", nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuickActions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuickActions_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorkDays",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CheckInTime = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CheckOutTime = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkDays", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Breaks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StartTime = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndTime = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    WorkDayId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Breaks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Breaks_WorkDays_WorkDayId",
                        column: x => x.WorkDayId,
                        principalTable: "WorkDays",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

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

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_WorkDayId",
                table: "TimeEntries",
                column: "WorkDayId");

            migrationBuilder.CreateIndex(
                name: "IX_Breaks_StartTime",
                table: "Breaks",
                column: "StartTime");

            migrationBuilder.CreateIndex(
                name: "IX_Breaks_WorkDayId",
                table: "Breaks",
                column: "WorkDayId");

            migrationBuilder.CreateIndex(
                name: "IX_QuickActions_SortOrder",
                table: "QuickActions",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_QuickActions_TaskId",
                table: "QuickActions",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkDays_CheckInTime",
                table: "WorkDays",
                column: "CheckInTime");

            migrationBuilder.CreateIndex(
                name: "IX_WorkDays_Date",
                table: "WorkDays",
                column: "Date");

            migrationBuilder.AddForeignKey(
                name: "FK_TimeEntries_WorkDays_WorkDayId",
                table: "TimeEntries",
                column: "WorkDayId",
                principalTable: "WorkDays",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimeEntries_WorkDays_WorkDayId",
                table: "TimeEntries");

            migrationBuilder.DropTable(
                name: "Breaks");

            migrationBuilder.DropTable(
                name: "QuickActions");

            migrationBuilder.DropTable(
                name: "WorkDays");

            migrationBuilder.DropIndex(
                name: "IX_TimeEntries_WorkDayId",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "WorkDayId",
                table: "TimeEntries");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 6, 23, 59, 43, 338, DateTimeKind.Utc).AddTicks(1445));

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 6, 23, 59, 43, 338, DateTimeKind.Utc).AddTicks(1445));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 6, 23, 59, 43, 338, DateTimeKind.Utc).AddTicks(1445));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 6, 23, 59, 43, 338, DateTimeKind.Utc).AddTicks(1445));

            migrationBuilder.UpdateData(
                table: "Projects",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 6, 23, 59, 43, 338, DateTimeKind.Utc).AddTicks(1445));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 6, 23, 59, 43, 338, DateTimeKind.Utc).AddTicks(1445));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 6, 23, 59, 43, 338, DateTimeKind.Utc).AddTicks(1445));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 6, 23, 59, 43, 338, DateTimeKind.Utc).AddTicks(1445));

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "Id",
                keyValue: 4,
                column: "CreatedAt",
                value: new DateTime(2026, 2, 6, 23, 59, 43, 338, DateTimeKind.Utc).AddTicks(1445));
        }
    }
}
