using System.Text;
using ClosedXML.Excel;
using Timekeeper.Api.DTOs;

namespace Timekeeper.Api.Services;

public interface IExportService
{
    byte[] ExportToCsv(IEnumerable<TimeEntryDto> entries);
    byte[] ExportToXlsx(IEnumerable<TimeEntryDto> entries);
}

public class ExportService : IExportService
{
    public byte[] ExportToCsv(IEnumerable<TimeEntryDto> entries)
    {
        var csv = new StringBuilder();
        csv.AppendLine("Start Date,Project No,Task Position,Procurement No,Project Name,Task Name,Task Description,Description 2,Notes,Billed Duration (Hours)");

        foreach (var entry in entries)
        {
            var startDate = entry.StartTime.ToString("yyyy-MM-dd");
            var billedDuration = entry.DurationMinutes.HasValue ? (entry.DurationMinutes.Value / 60.0).ToString("F2") : "";
            csv.AppendLine($"\"{startDate}\",\"{entry.ProjectNo ?? ""}\",\"{entry.TaskPosition ?? ""}\",\"{entry.TaskProcurementNumber ?? ""}\",\"{entry.ProjectName ?? ""}\",\"{entry.TaskName ?? ""}\",\"{entry.TaskDescription?.Replace("\"", "\"\"") ?? ""}\",\"\",\"{entry.Notes?.Replace("\"", "\"\"") ?? ""}\",\"{billedDuration}\"");
        }

        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    public byte[] ExportToXlsx(IEnumerable<TimeEntryDto> entries)
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Time Entries");

        worksheet.Cell(1, 1).Value = "Start Date";
        worksheet.Cell(1, 2).Value = "Project No";
        worksheet.Cell(1, 3).Value = "Task Position";
        worksheet.Cell(1, 4).Value = "Procurement No";
        worksheet.Cell(1, 5).Value = "Project Name";
        worksheet.Cell(1, 6).Value = "Task Name";
        worksheet.Cell(1, 7).Value = "Task Description";
        worksheet.Cell(1, 8).Value = "Description 2";
        worksheet.Cell(1, 9).Value = "Notes";
        worksheet.Cell(1, 10).Value = "Billed Duration (Hours)";

        var headerRange = worksheet.Range(1, 1, 1, 10);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

        int row = 2;
        foreach (var entry in entries)
        {
            worksheet.Cell(row, 1).Value = entry.StartTime.ToString("yyyy-MM-dd");
            worksheet.Cell(row, 2).Value = entry.ProjectNo ?? "";
            worksheet.Cell(row, 3).Value = entry.TaskPosition ?? "";
            worksheet.Cell(row, 4).Value = entry.TaskProcurementNumber ?? "";
            worksheet.Cell(row, 5).Value = entry.ProjectName ?? "";
            worksheet.Cell(row, 6).Value = entry.TaskName ?? "";
            worksheet.Cell(row, 7).Value = entry.TaskDescription ?? "";
            worksheet.Cell(row, 8).Value = "";
            worksheet.Cell(row, 9).Value = entry.Notes ?? "";
            
            if (entry.DurationMinutes.HasValue)
            {
                worksheet.Cell(row, 10).Value = (entry.DurationMinutes.Value / 60.0).ToString("F2");
            }
            else
            {
                worksheet.Cell(row, 10).Value = "";
            }

            row++;
        }

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
