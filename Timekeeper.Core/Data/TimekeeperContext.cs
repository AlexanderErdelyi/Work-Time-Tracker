using Microsoft.EntityFrameworkCore;
using Timekeeper.Core.Models;

namespace Timekeeper.Core.Data;

public class TimekeeperContext : DbContext
{
    public TimekeeperContext(DbContextOptions<TimekeeperContext> options) : base(options)
    {
    }

    public DbSet<Customer> Customers { get; set; } = null!;
    public DbSet<Project> Projects { get; set; } = null!;
    public DbSet<TaskItem> Tasks { get; set; } = null!;
    public DbSet<TimeEntry> TimeEntries { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.Name);
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.Name);

            entity.HasOne(e => e.Customer)
                .WithMany(c => c.Projects)
                .HasForeignKey(e => e.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.Name);

            entity.HasOne(e => e.Project)
                .WithMany(p => p.Tasks)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TimeEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.HasIndex(e => e.StartTime);
            entity.HasIndex(e => e.EndTime);

            entity.HasOne(e => e.Task)
                .WithMany(t => t.TimeEntries)
                .HasForeignKey(e => e.TaskId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        SeedData(modelBuilder);
    }

    private void SeedData(ModelBuilder modelBuilder)
    {
        var now = DateTime.UtcNow;

        modelBuilder.Entity<Customer>().HasData(
            new Customer { Id = 1, Name = "Acme Corp", Description = "Sample customer", IsActive = true, CreatedAt = now },
            new Customer { Id = 2, Name = "TechStart Inc", Description = "Technology startup", IsActive = true, CreatedAt = now }
        );

        modelBuilder.Entity<Project>().HasData(
            new Project { Id = 1, Name = "Website Redesign", Description = "Redesign company website", CustomerId = 1, IsActive = true, CreatedAt = now },
            new Project { Id = 2, Name = "Mobile App", Description = "Develop mobile application", CustomerId = 1, IsActive = true, CreatedAt = now },
            new Project { Id = 3, Name = "API Development", Description = "Build REST API", CustomerId = 2, IsActive = true, CreatedAt = now }
        );

        modelBuilder.Entity<TaskItem>().HasData(
            new TaskItem { Id = 1, Name = "Frontend Development", Description = "Develop frontend UI", ProjectId = 1, IsActive = true, CreatedAt = now },
            new TaskItem { Id = 2, Name = "Backend Development", Description = "Develop backend services", ProjectId = 1, IsActive = true, CreatedAt = now },
            new TaskItem { Id = 3, Name = "UI Design", Description = "Design user interface", ProjectId = 2, IsActive = true, CreatedAt = now },
            new TaskItem { Id = 4, Name = "API Endpoints", Description = "Implement REST endpoints", ProjectId = 3, IsActive = true, CreatedAt = now }
        );
    }
}
