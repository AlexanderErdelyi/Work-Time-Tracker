using Microsoft.EntityFrameworkCore;
using Timekeeper.Core.Models;
using Timekeeper.Core.Services;

namespace Timekeeper.Core.Data;

public class TimekeeperContext : DbContext
{
    private const int DefaultWorkspaceId = 1;
    private readonly IWorkspaceContext? _workspaceContext;

    public TimekeeperContext(DbContextOptions<TimekeeperContext> options, IWorkspaceContext? workspaceContext = null) : base(options)
    {
        _workspaceContext = workspaceContext;
    }

    private int CurrentWorkspaceId => _workspaceContext?.WorkspaceId > 0
        ? _workspaceContext.WorkspaceId
        : DefaultWorkspaceId;

    public DbSet<Workspace> Workspaces { get; set; } = null!;
    public DbSet<AppUser> Users { get; set; } = null!;
    public DbSet<Customer> Customers { get; set; } = null!;
    public DbSet<Project> Projects { get; set; } = null!;
    public DbSet<TaskItem> Tasks { get; set; } = null!;
    public DbSet<TimeEntry> TimeEntries { get; set; } = null!;
    public DbSet<Break> Breaks { get; set; } = null!;
    public DbSet<WorkDay> WorkDays { get; set; } = null!;
    public DbSet<QuickAction> QuickActions { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Workspace>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.Name).IsUnique();
            entity.HasQueryFilter(e => e.Id == CurrentWorkspaceId);
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(320);
            entity.Property(e => e.Role).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasOne(e => e.Workspace)
                .WithMany(w => w.Users)
                .HasForeignKey(e => e.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => e.WorkspaceId == CurrentWorkspaceId);
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WorkspaceId).HasDefaultValue(DefaultWorkspaceId);
            entity.Property(e => e.No).HasMaxLength(20);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => new { e.WorkspaceId, e.Name });
            entity.HasQueryFilter(e => e.WorkspaceId == CurrentWorkspaceId);

            entity.HasOne<Workspace>()
                .WithMany()
                .HasForeignKey(e => e.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WorkspaceId).HasDefaultValue(DefaultWorkspaceId);
            entity.Property(e => e.No).HasMaxLength(20);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => new { e.WorkspaceId, e.Name });
            entity.HasQueryFilter(e => e.WorkspaceId == CurrentWorkspaceId);

            entity.HasOne<Workspace>()
                .WithMany()
                .HasForeignKey(e => e.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Customer)
                .WithMany(c => c.Projects)
                .HasForeignKey(e => e.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WorkspaceId).HasDefaultValue(DefaultWorkspaceId);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Position).HasMaxLength(20);
            entity.Property(e => e.ProcurementNumber).HasMaxLength(20);
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => new { e.WorkspaceId, e.Name });
            entity.HasQueryFilter(e => e.WorkspaceId == CurrentWorkspaceId);

            entity.HasOne<Workspace>()
                .WithMany()
                .HasForeignKey(e => e.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Project)
                .WithMany(p => p.Tasks)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TimeEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WorkspaceId).HasDefaultValue(DefaultWorkspaceId);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.HasIndex(e => e.StartTime);
            entity.HasIndex(e => e.EndTime);
            entity.HasIndex(e => new { e.WorkspaceId, e.StartTime });
            entity.HasQueryFilter(e => e.WorkspaceId == CurrentWorkspaceId);

            entity.HasOne<Workspace>()
                .WithMany()
                .HasForeignKey(e => e.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Task)
                .WithMany(t => t.TimeEntries)
                .HasForeignKey(e => e.TaskId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.WorkDay)
                .WithMany(w => w.TimeEntries)
                .HasForeignKey(e => e.WorkDayId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Break>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WorkspaceId).HasDefaultValue(DefaultWorkspaceId);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.HasIndex(e => e.StartTime);
            entity.HasIndex(e => new { e.WorkspaceId, e.StartTime });
            entity.HasQueryFilter(e => e.WorkspaceId == CurrentWorkspaceId);

            entity.HasOne<Workspace>()
                .WithMany()
                .HasForeignKey(e => e.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.WorkDay)
                .WithMany(w => w.Breaks)
                .HasForeignKey(e => e.WorkDayId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<WorkDay>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WorkspaceId).HasDefaultValue(DefaultWorkspaceId);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => e.CheckInTime);
            entity.HasIndex(e => new { e.WorkspaceId, e.Date });
            entity.HasQueryFilter(e => e.WorkspaceId == CurrentWorkspaceId);

            entity.HasOne<Workspace>()
                .WithMany()
                .HasForeignKey(e => e.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<QuickAction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WorkspaceId).HasDefaultValue(DefaultWorkspaceId);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Icon).HasMaxLength(50);
            entity.HasIndex(e => e.SortOrder);
            entity.HasIndex(e => new { e.WorkspaceId, e.SortOrder });
            entity.HasQueryFilter(e => e.WorkspaceId == CurrentWorkspaceId);

            entity.HasOne<Workspace>()
                .WithMany()
                .HasForeignKey(e => e.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Task)
                .WithMany()
                .HasForeignKey(e => e.TaskId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        SeedData(modelBuilder);
    }

    private void SeedData(ModelBuilder modelBuilder)
    {
        var now = DateTime.UtcNow;

        modelBuilder.Entity<Workspace>().HasData(
            new Workspace { Id = DefaultWorkspaceId, Name = "Default Workspace", IsActive = true, CreatedAt = now }
        );

        modelBuilder.Entity<AppUser>().HasData(
            new AppUser
            {
                Id = 1,
                DisplayName = "Local Admin",
                Email = "admin@local.timekeeper",
                Role = UserRole.Admin,
                WorkspaceId = DefaultWorkspaceId,
                IsActive = true,
                CreatedAt = now
            }
        );

        modelBuilder.Entity<Customer>().HasData(
            new Customer { Id = 1, WorkspaceId = DefaultWorkspaceId, Name = "Acme Corp", Description = "Sample customer", IsActive = true, CreatedAt = now },
            new Customer { Id = 2, WorkspaceId = DefaultWorkspaceId, Name = "TechStart Inc", Description = "Technology startup", IsActive = true, CreatedAt = now }
        );

        modelBuilder.Entity<Project>().HasData(
            new Project { Id = 1, WorkspaceId = DefaultWorkspaceId, Name = "Website Redesign", Description = "Redesign company website", CustomerId = 1, IsActive = true, CreatedAt = now },
            new Project { Id = 2, WorkspaceId = DefaultWorkspaceId, Name = "Mobile App", Description = "Develop mobile application", CustomerId = 1, IsActive = true, CreatedAt = now },
            new Project { Id = 3, WorkspaceId = DefaultWorkspaceId, Name = "API Development", Description = "Build REST API", CustomerId = 2, IsActive = true, CreatedAt = now }
        );

        modelBuilder.Entity<TaskItem>().HasData(
            new TaskItem { Id = 1, WorkspaceId = DefaultWorkspaceId, Name = "Frontend Development", Description = "Develop frontend UI", ProjectId = 1, IsActive = true, CreatedAt = now },
            new TaskItem { Id = 2, WorkspaceId = DefaultWorkspaceId, Name = "Backend Development", Description = "Develop backend services", ProjectId = 1, IsActive = true, CreatedAt = now },
            new TaskItem { Id = 3, WorkspaceId = DefaultWorkspaceId, Name = "UI Design", Description = "Design user interface", ProjectId = 2, IsActive = true, CreatedAt = now },
            new TaskItem { Id = 4, WorkspaceId = DefaultWorkspaceId, Name = "API Endpoints", Description = "Implement REST endpoints", ProjectId = 3, IsActive = true, CreatedAt = now }
        );
    }

    public override int SaveChanges()
    {
        ApplyWorkspaceContext();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyWorkspaceContext();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyWorkspaceContext()
    {
        var workspaceId = CurrentWorkspaceId;

        foreach (var entry in ChangeTracker.Entries<IWorkspaceOwned>())
        {
            if (entry.State == EntityState.Added && entry.Entity.WorkspaceId <= 0)
            {
                entry.Entity.WorkspaceId = workspaceId;
            }
        }
    }
}
