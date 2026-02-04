using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Timekeeper.Core.Data;

public class TimekeeperContextFactory : IDesignTimeDbContextFactory<TimekeeperContext>
{
    public TimekeeperContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<TimekeeperContext>();
        optionsBuilder.UseSqlite("Data Source=timekeeper.db");

        return new TimekeeperContext(optionsBuilder.Options);
    }
}
