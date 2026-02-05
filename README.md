# ⏱️ Timekeeper - Time Tracking Application

A comprehensive C# .NET 8 time tracking application with a clean web interface for managing time entries, customers, projects, and tasks.

## Features

### Easy Distribution 🎁
- **Self-Contained Build**: No .NET installation required - just extract and run!
- **One-Click Start**: Simple `START_TIMEKEEPER.bat` for non-technical users
- **Portable**: Copy to USB drive or any folder - works anywhere
- **Offline**: No internet connection needed

### Timer Management
- **Start/Stop Timer**: Track time with a single-click timer (no parallel timers allowed)
- **Running Timer Display**: Live timer display with elapsed time
- **Timer Status**: View current task, project, and customer while timer is running

### CRUD Operations
- **Customers**: Create, read, update, and delete customers
- **Projects**: Manage projects with customer associations
- **Tasks**: Create tasks under specific projects
- **Time Entries**: Full CRUD for time entries with manual entry support

### Filtering & Search
- **Date Range Filters**: Filter entries by start and end dates
- **Entity Filters**: Filter by customer, project, or task
- **Text Search**: Search across all time entry fields
- **Running Entry Filter**: Show only running or completed entries

### Reports
- **Daily Totals**: Aggregate time entries by day
- **Weekly Totals**: Aggregate time entries by week (Monday-Sunday)
- **Customizable**: Filter reports by date range, customer, or project

### Export
- **CSV Export**: Export filtered time entries to CSV format
- **XLSX Export**: Export filtered time entries to Excel format with formatting

### User Interface
- **Clean, Modern Design**: Gradient background with card-based layout
- **Responsive**: Mobile-friendly design
- **Tab Navigation**: Easy switching between different sections
- **Modal Forms**: Clean modal dialogs for creating and editing entities
- **Real-time Updates**: Live timer display and instant data refresh

## Technology Stack

- **Backend**: ASP.NET Core 8.0 Web API
- **Database**: SQLite with Entity Framework Core 8.0
- **Frontend**: Vanilla JavaScript with modern CSS
- **Export**: ClosedXML for Excel generation
- **Testing**: xUnit with In-Memory database

## 📚 Documentation

- **[Setup Guide for End Users](SETUP_GUIDE.md)** - Simple instructions for non-technical users
- **[Distribution Guide](DISTRIBUTION_GUIDE.md)** - How to share and update the application
- **[GitHub Setup](GITHUB_SETUP_SUMMARY.md)** - GitHub configuration details

## Project Structure

```
Timekeeper/
├── Timekeeper.Core/          # Core business logic and data models
│   ├── Data/                 # EF Core DbContext and migrations
│   ├── Models/               # Entity models
│   └── Services/             # Business logic services
├── Timekeeper.Api/           # Web API and UI
│   ├── Controllers/          # API controllers
│   ├── DTOs/                 # Data transfer objects
│   ├── Services/             # Export services
│   └── wwwroot/              # Static web files (HTML, CSS, JS)
└── Timekeeper.Tests/         # Unit and integration tests
```

## Getting Started

### For End Users (No Technical Knowledge Required) 🌟

**Easiest Way - Self-Contained Version:**

Ask your administrator to create a standalone build using:
```powershell
.\publish-standalone.ps1 -Version "1.0.0"
```

Then you just:
1. Download and extract the ZIP file
2. Double-click **`START_TIMEKEEPER.bat`**
3. Start tracking time! 🎉

**No installation, no setup, no command line!**

See [SIMPLE_USER_GUIDE.md](SIMPLE_USER_GUIDE.md) for detailed instructions.

---

### Prerequisites
- .NET 8.0 SDK or later ([Download here](https://dotnet.microsoft.com/download))

### Quick Start (For End Users)

#### Option 1: Run with Helper Scripts (Recommended)
1. Clone or download the repository
2. Run the application:
   - **Windows**: Double-click `run-api.ps1` or run in PowerShell
   - **Alternative**: Use `.\build.ps1` to build first, then `.\run-api.ps1`
3. Open your browser to `http://localhost:5000`

#### Option 2: Manual Start
1. Open a terminal in the project folder
2. Run:
```bash
dotnet run --project Timekeeper.Api/Timekeeper.Api.csproj
```
3. Open your browser to `http://localhost:5000`

### For Developers

1. Clone the repository:
```bash
git clone https://github.com/AlexanderErdelyi/Work-Time-Tracker.git
cd Work-Time-Tracker
```

2. Build the solution:
```bash
dotnet build
# Or use the build script: .\build.ps1
```

3. Run the tests:
```bash
dotnet test
```

4. Run the application:
```bash
cd Timekeeper.Api
dotnet run
# Or use the run script from root: .\run-api.ps1
```

5. Open your browser and navigate to:
```
http://localhost:5000
```

Or to view the API documentation:
```
http://localhost:5000/swagger
```

### Updating to a New Version

When a new version is released:

1. **Pull latest changes** (if using Git):
```bash
git pull origin main
```

2. **Rebuild the application**:
```bash
.\build.ps1
```

3. **Restart the application**:
```bash
.\run-api.ps1
```

Your database and settings are preserved automatically.

### Initial Seed Data

The application includes seed data:
- 2 customers (Acme Corp, TechStart Inc)
- 3 projects (Website Redesign, Mobile App, API Development)
- 4 tasks (Frontend Development, Backend Development, UI Design, API Endpoints)

## API Endpoints

### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/{id}` - Get customer by ID
- `POST /api/customers` - Create new customer
- `PUT /api/customers/{id}` - Update customer
- `DELETE /api/customers/{id}` - Delete customer

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/{id}` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

### Tasks
- `GET /api/tasks` - List all tasks
- `GET /api/tasks/{id}` - Get task by ID
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Time Entries
- `GET /api/timeentries` - List time entries (with filtering)
- `GET /api/timeentries/{id}` - Get time entry by ID
- `GET /api/timeentries/running` - Get currently running entry
- `POST /api/timeentries/start` - Start timer
- `POST /api/timeentries/{id}/stop` - Stop timer
- `POST /api/timeentries` - Create manual time entry
- `PUT /api/timeentries/{id}` - Update time entry
- `DELETE /api/timeentries/{id}` - Delete time entry
- `GET /api/timeentries/daily-totals` - Get daily aggregates
- `GET /api/timeentries/weekly-totals` - Get weekly aggregates

### Export
- `GET /api/export/csv` - Export to CSV
- `GET /api/export/xlsx` - Export to Excel

## Database

The application uses SQLite for data storage. The database file (`timekeeper.db`) is created automatically in the application directory on first run.

### Migrations

To add a new migration:
```bash
cd Timekeeper.Core
dotnet ef migrations add MigrationName --output-dir Data/Migrations
```

To update the database:
```bash
cd Timekeeper.Core
dotnet ef database update
```

## Testing

Run all tests:
```bash
dotnet test
```

The test suite includes:
- Unit tests for business logic
- Service tests with in-memory database
- Model relationship tests
- Timer functionality tests

## License

This project is open source and available under the MIT License.