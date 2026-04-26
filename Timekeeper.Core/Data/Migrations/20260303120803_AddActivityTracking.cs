using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Timekeeper.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ActivityEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    WorkspaceId = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    Source = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    EventType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    ExternalId = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    StartTime = table.Column<DateTime>(type: "TEXT", nullable: true),
                    EndTime = table.Column<DateTime>(type: "TEXT", nullable: true),
                    EstimatedMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    MetadataJson = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false, defaultValue: "{}"),
                    SuggestionState = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    SuggestedCustomerId = table.Column<int>(type: "INTEGER", nullable: true),
                    SuggestedProjectId = table.Column<int>(type: "INTEGER", nullable: true),
                    SuggestedTaskId = table.Column<int>(type: "INTEGER", nullable: true),
                    SuggestedNotes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    Confidence = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    LinkedTimeEntryId = table.Column<int>(type: "INTEGER", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ActivityEvents_Customers_SuggestedCustomerId",
                        column: x => x.SuggestedCustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ActivityEvents_Projects_SuggestedProjectId",
                        column: x => x.SuggestedProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ActivityEvents_Tasks_SuggestedTaskId",
                        column: x => x.SuggestedTaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ActivityEvents_TimeEntries_LinkedTimeEntryId",
                        column: x => x.LinkedTimeEntryId,
                        principalTable: "TimeEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ActivityEvents_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ActivityEvents_Workspaces_WorkspaceId",
                        column: x => x.WorkspaceId,
                        principalTable: "Workspaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ActivityMappingRules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    WorkspaceId = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    MatchField = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    MatchOperator = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    MatchValue = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    MappedCustomerId = table.Column<int>(type: "INTEGER", nullable: true),
                    MappedProjectId = table.Column<int>(type: "INTEGER", nullable: true),
                    MappedTaskId = table.Column<int>(type: "INTEGER", nullable: true),
                    Priority = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityMappingRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ActivityMappingRules_Customers_MappedCustomerId",
                        column: x => x.MappedCustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ActivityMappingRules_Projects_MappedProjectId",
                        column: x => x.MappedProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ActivityMappingRules_Tasks_MappedTaskId",
                        column: x => x.MappedTaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ActivityMappingRules_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ActivityMappingRules_Workspaces_WorkspaceId",
                        column: x => x.WorkspaceId,
                        principalTable: "Workspaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserActivityPreferences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    WorkspaceId = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    NotesLanguage = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false, defaultValue: "en"),
                    BusinessHoursStart = table.Column<int>(type: "INTEGER", nullable: false),
                    BusinessHoursEnd = table.Column<int>(type: "INTEGER", nullable: false),
                    AutoCreateDrafts = table.Column<bool>(type: "INTEGER", nullable: false),
                    MinActivityMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserActivityPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserActivityPreferences_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserActivityPreferences_Workspaces_WorkspaceId",
                        column: x => x.WorkspaceId,
                        principalTable: "Workspaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserIntegrations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    WorkspaceId = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    Provider = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    AccessToken = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    RefreshToken = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    EnabledSourcesJson = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false, defaultValue: "[]"),
                    LastSyncedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserIntegrations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserIntegrations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserIntegrations_Workspaces_WorkspaceId",
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
                name: "IX_ActivityEvents_LinkedTimeEntryId",
                table: "ActivityEvents",
                column: "LinkedTimeEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityEvents_StartTime",
                table: "ActivityEvents",
                column: "StartTime");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityEvents_SuggestedCustomerId",
                table: "ActivityEvents",
                column: "SuggestedCustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityEvents_SuggestedProjectId",
                table: "ActivityEvents",
                column: "SuggestedProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityEvents_SuggestedTaskId",
                table: "ActivityEvents",
                column: "SuggestedTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityEvents_UserId",
                table: "ActivityEvents",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityEvents_WorkspaceId_UserId_Source_ExternalId",
                table: "ActivityEvents",
                columns: new[] { "WorkspaceId", "UserId", "Source", "ExternalId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ActivityEvents_WorkspaceId_UserId_SuggestionState",
                table: "ActivityEvents",
                columns: new[] { "WorkspaceId", "UserId", "SuggestionState" });

            migrationBuilder.CreateIndex(
                name: "IX_ActivityMappingRules_MappedCustomerId",
                table: "ActivityMappingRules",
                column: "MappedCustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityMappingRules_MappedProjectId",
                table: "ActivityMappingRules",
                column: "MappedProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityMappingRules_MappedTaskId",
                table: "ActivityMappingRules",
                column: "MappedTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityMappingRules_UserId",
                table: "ActivityMappingRules",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityMappingRules_WorkspaceId_UserId_Priority",
                table: "ActivityMappingRules",
                columns: new[] { "WorkspaceId", "UserId", "Priority" });

            migrationBuilder.CreateIndex(
                name: "IX_UserActivityPreferences_UserId",
                table: "UserActivityPreferences",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserActivityPreferences_WorkspaceId_UserId",
                table: "UserActivityPreferences",
                columns: new[] { "WorkspaceId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserIntegrations_UserId",
                table: "UserIntegrations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserIntegrations_WorkspaceId_UserId_Provider",
                table: "UserIntegrations",
                columns: new[] { "WorkspaceId", "UserId", "Provider" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActivityEvents");

            migrationBuilder.DropTable(
                name: "ActivityMappingRules");

            migrationBuilder.DropTable(
                name: "UserActivityPreferences");

            migrationBuilder.DropTable(
                name: "UserIntegrations");

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
                column: "CreatedAt",
                value: new DateTime(2026, 3, 3, 7, 24, 3, 143, DateTimeKind.Utc).AddTicks(7228));
        }
    }
}
