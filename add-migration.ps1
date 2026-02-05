# Add Database Migration
param(
    [Parameter(Mandatory=$true)]
    [string]$MigrationName
)

Write-Host "Creating migration: $MigrationName" -ForegroundColor Cyan

# Create the migration
dotnet ef migrations add $MigrationName --project Timekeeper.Core --startup-project Timekeeper.Api

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nMigration created successfully!" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Review the migration file in Timekeeper.Core/Data/Migrations/" -ForegroundColor Yellow
    Write-Host "  2. Run .\build.ps1 to rebuild the solution" -ForegroundColor Yellow
    Write-Host "  3. Run .\run-api.ps1 to start the API (migration will be applied automatically)" -ForegroundColor Yellow
} else {
    Write-Host "`nMigration failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}
