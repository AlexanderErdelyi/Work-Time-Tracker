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
        csv.AppendLine("Customer,Project,Task,Start Time,End Time,Duration (Hours),Notes");

        foreach (var entry in entries)
        {
            var duration = entry.DurationMinutes.HasValue ? (entry.DurationMinutes.Value / 60.0).ToString("F2") : "Running";
            csv.AppendLine($"\"{entry.CustomerName}\",\"{entry.ProjectName}\",\"{entry.TaskName}\",\"{entry.StartTime:yyyy-MM-dd HH:mm:ss}\",\"{(entry.EndTime.HasValue ? entry.EndTime.Value.ToString("yyyy-MM-dd HH:mm:ss") : "")}\",\"{duration}\",\"{entry.Notes?.Replace("\"", "\"\"")}\"");
        }

        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    public byte[] ExportToXlsx(IEnumerable<TimeEntryDto> entries)
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Time Entries");

        worksheet.Cell(1, 1).Value = "Customer";
        worksheet.Cell(1, 2).Value = "Project";
        worksheet.Cell(1, 3).Value = "Task";
        worksheet.Cell(1, 4).Value = "Start Time";
        worksheet.Cell(1, 5).Value = "End Time";
        worksheet.Cell(1, 6).Value = "Duration (Hours)";
        worksheet.Cell(1, 7).Value = "Notes";

        var headerRange = worksheet.Range(1, 1, 1, 7);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

        int row = 2;
        foreach (var entry in entries)
        {
            worksheet.Cell(row, 1).Value = entry.CustomerName;
            worksheet.Cell(row, 2).Value = entry.ProjectName;
            worksheet.Cell(row, 3).Value = entry.TaskName;
            worksheet.Cell(row, 4).Value = entry.StartTime.ToString("yyyy-MM-dd HH:mm:ss");
            worksheet.Cell(row, 5).Value = entry.EndTime.HasValue ? entry.EndTime.Value.ToString("yyyy-MM-dd HH:mm:ss") : "";
            
            if (entry.DurationMinutes.HasValue)
            {
                worksheet.Cell(row, 6).Value = (entry.DurationMinutes.Value / 60.0).ToString("F2");
            }
            else
            {
                worksheet.Cell(row, 6).Value = "Running";
            }

            worksheet.Cell(row, 7).Value = entry.Notes ?? "";
            row++;
        }

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
