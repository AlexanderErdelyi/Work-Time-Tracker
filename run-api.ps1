# Run Timekeeper API
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://localhost:5000"
Set-Location -Path "$PSScriptRoot\Timekeeper.Api"
dotnet "$PSScriptRoot\Timekeeper.Api\bin\Debug\net8.0\Timekeeper.Api.dll"
