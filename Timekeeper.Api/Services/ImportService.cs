using ClosedXML.Excel;
using Timekeeper.Api.DTOs;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Timekeeper.Api.Services;

public interface IImportService
{
    Task<TaskImportResultDto> ImportTasksFromExcelAsync(Stream excelStream);
    byte[] GenerateTaskImportTemplate();
}

public class ImportService : IImportService
{
    private readonly TimekeeperContext _context;

    public ImportService(TimekeeperContext context)
    {
        _context = context;
    }

    public async Task<TaskImportResultDto> ImportTasksFromExcelAsync(Stream excelStream)
    {
        var result = new TaskImportResultDto();

        try
        {
            using var workbook = new XLWorkbook(excelStream);
            var worksheet = workbook.Worksheet(1);
            
            // Find the header row
            var headerRow = worksheet.Row(1);
            var lastColumn = headerRow.LastCellUsed()?.Address.ColumnNumber ?? 0;
            
            if (lastColumn == 0)
            {
                result.Errors.Add("Excel file is empty or has no headers");
                return result;
            }

            // Read all rows
            var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 1;
            
            for (int row = 2; row <= lastRow; row++)
            {
                try
                {
                    var taskImport = new TaskImportDto
                    {
                        CustomerName = worksheet.Cell(row, 1).GetString().Trim(),
                        CustomerNo = worksheet.Cell(row, 2).GetString().Trim(),
                        CustomerDescription = worksheet.Cell(row, 3).GetString().Trim(),
                        ProjectName = worksheet.Cell(row, 4).GetString().Trim(),
                        ProjectNo = worksheet.Cell(row, 5).GetString().Trim(),
                        ProjectDescription = worksheet.Cell(row, 6).GetString().Trim(),
                        TaskName = worksheet.Cell(row, 7).GetString().Trim(),
                        TaskDescription = worksheet.Cell(row, 8).GetString().Trim(),
                        TaskPosition = worksheet.Cell(row, 9).GetString().Trim(),
                        TaskProcurementNumber = worksheet.Cell(row, 10).GetString().Trim()
                    };

                    // Skip empty rows
                    if (string.IsNullOrWhiteSpace(taskImport.CustomerName) &&
                        string.IsNullOrWhiteSpace(taskImport.ProjectName) &&
                        string.IsNullOrWhiteSpace(taskImport.TaskName))
                    {
                        continue;
                    }

                    // Validate required fields
                    if (string.IsNullOrWhiteSpace(taskImport.CustomerName))
                    {
                        result.Errors.Add($"Row {row}: Customer Name is required");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(taskImport.ProjectName))
                    {
                        result.Errors.Add($"Row {row}: Project Name is required");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(taskImport.TaskName))
                    {
                        result.Errors.Add($"Row {row}: Task Name is required");
                        continue;
                    }

                    // Process the import
                    await ProcessTaskImportAsync(taskImport, result);
                }
                catch (Exception ex)
                {
                    result.Errors.Add($"Row {row}: {ex.Message}");
                }
            }

            // Save all changes at once
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            result.Errors.Add($"Error reading Excel file: {ex.Message}");
        }

        return result;
    }

    private async Task ProcessTaskImportAsync(TaskImportDto dto, TaskImportResultDto result)
    {
        // Find or create customer
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Name == dto.CustomerName);

        if (customer == null)
        {
            customer = new Customer
            {
                Name = dto.CustomerName,
                No = string.IsNullOrWhiteSpace(dto.CustomerNo) ? null : dto.CustomerNo,
                Description = string.IsNullOrWhiteSpace(dto.CustomerDescription) ? null : dto.CustomerDescription
            };
            _context.Customers.Add(customer);
            result.CustomersCreated++;
        }
        else
        {
            // Update customer if fields provided
            bool updated = false;
            if (!string.IsNullOrWhiteSpace(dto.CustomerNo) && customer.No != dto.CustomerNo)
            {
                customer.No = dto.CustomerNo;
                updated = true;
            }
            if (!string.IsNullOrWhiteSpace(dto.CustomerDescription) && customer.Description != dto.CustomerDescription)
            {
                customer.Description = dto.CustomerDescription;
                updated = true;
            }
            if (updated)
            {
                customer.UpdatedAt = DateTime.UtcNow;
                result.CustomersUpdated++;
            }
        }

        // Save to get customer ID
        await _context.SaveChangesAsync();

        // Find or create project
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Name == dto.ProjectName && p.CustomerId == customer.Id);

        if (project == null)
        {
            project = new Project
            {
                Name = dto.ProjectName,
                No = string.IsNullOrWhiteSpace(dto.ProjectNo) ? null : dto.ProjectNo,
                Description = string.IsNullOrWhiteSpace(dto.ProjectDescription) ? null : dto.ProjectDescription,
                CustomerId = customer.Id
            };
            _context.Projects.Add(project);
            result.ProjectsCreated++;
        }
        else
        {
            // Update project if fields provided
            bool updated = false;
            if (!string.IsNullOrWhiteSpace(dto.ProjectNo) && project.No != dto.ProjectNo)
            {
                project.No = dto.ProjectNo;
                updated = true;
            }
            if (!string.IsNullOrWhiteSpace(dto.ProjectDescription) && project.Description != dto.ProjectDescription)
            {
                project.Description = dto.ProjectDescription;
                updated = true;
            }
            if (updated)
            {
                project.UpdatedAt = DateTime.UtcNow;
                result.ProjectsUpdated++;
            }
        }

        // Save to get project ID
        await _context.SaveChangesAsync();

        // Find or create task
        var task = await _context.Tasks
            .FirstOrDefaultAsync(t => t.Name == dto.TaskName && t.ProjectId == project.Id);

        if (task == null)
        {
            task = new TaskItem
            {
                Name = dto.TaskName,
                Description = string.IsNullOrWhiteSpace(dto.TaskDescription) ? null : dto.TaskDescription,
                Position = string.IsNullOrWhiteSpace(dto.TaskPosition) ? null : dto.TaskPosition,
                ProcurementNumber = string.IsNullOrWhiteSpace(dto.TaskProcurementNumber) ? null : dto.TaskProcurementNumber,
                ProjectId = project.Id
            };
            _context.Tasks.Add(task);
            result.TasksCreated++;
        }
        else
        {
            // Update task if fields provided
            bool updated = false;
            if (!string.IsNullOrWhiteSpace(dto.TaskDescription) && task.Description != dto.TaskDescription)
            {
                task.Description = dto.TaskDescription;
                updated = true;
            }
            if (!string.IsNullOrWhiteSpace(dto.TaskPosition) && task.Position != dto.TaskPosition)
            {
                task.Position = dto.TaskPosition;
                updated = true;
            }
            if (!string.IsNullOrWhiteSpace(dto.TaskProcurementNumber) && task.ProcurementNumber != dto.TaskProcurementNumber)
            {
                task.ProcurementNumber = dto.TaskProcurementNumber;
                updated = true;
            }
            if (updated)
            {
                task.UpdatedAt = DateTime.UtcNow;
                result.TasksUpdated++;
            }
        }
    }

    public byte[] GenerateTaskImportTemplate()
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Task Import Template");

        // Add headers
        worksheet.Cell(1, 1).Value = "Customer Name";
        worksheet.Cell(1, 2).Value = "Customer No";
        worksheet.Cell(1, 3).Value = "Customer Description";
        worksheet.Cell(1, 4).Value = "Project Name";
        worksheet.Cell(1, 5).Value = "Project No";
        worksheet.Cell(1, 6).Value = "Project Description";
        worksheet.Cell(1, 7).Value = "Task Name";
        worksheet.Cell(1, 8).Value = "Task Description";
        worksheet.Cell(1, 9).Value = "Task Position";
        worksheet.Cell(1, 10).Value = "Task Procurement Number";

        var headerRange = worksheet.Range(1, 1, 1, 10);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

        // Add sample data
        worksheet.Cell(2, 1).Value = "Acme Corp";
        worksheet.Cell(2, 2).Value = "CUST001";
        worksheet.Cell(2, 3).Value = "Sample customer";
        worksheet.Cell(2, 4).Value = "Website Redesign";
        worksheet.Cell(2, 5).Value = "PROJ001";
        worksheet.Cell(2, 6).Value = "Redesign company website";
        worksheet.Cell(2, 7).Value = "Frontend Development";
        worksheet.Cell(2, 8).Value = "Develop frontend UI";
        worksheet.Cell(2, 9).Value = "POS001";
        worksheet.Cell(2, 10).Value = "PROC001";

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
