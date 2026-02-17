using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Timekeeper.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBilledHours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BilledHours",
                table: "TimeEntries",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BilledHours",
                table: "TimeEntries");
        }
    }
}
