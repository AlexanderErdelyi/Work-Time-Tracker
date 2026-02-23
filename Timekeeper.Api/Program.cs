using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using Timekeeper.Api.Auth;
using Timekeeper.Api.Services;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;
using Timekeeper.Core.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Ensure DateTime values are treated as UTC
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IWorkspaceContext, HttpWorkspaceContext>();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = HeaderAuthenticationHandler.SchemeName;
    options.DefaultChallengeScheme = HeaderAuthenticationHandler.SchemeName;
})
.AddScheme<AuthenticationSchemeOptions, HeaderAuthenticationHandler>(
    HeaderAuthenticationHandler.SchemeName,
    _ => { });

builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build())
    .AddPolicy(AuthorizationPolicies.AdminOnly, policy =>
        policy.RequireRole(UserRole.Admin.ToString()))
    .AddPolicy(AuthorizationPolicies.ManagerOrAdmin, policy =>
        policy.RequireRole(UserRole.Admin.ToString(), UserRole.Manager.ToString()));

// Configure Database
builder.Services.AddDbContext<TimekeeperContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") 
        ?? "Data Source=timekeeper.db"));

// Register services
builder.Services.AddScoped<ITimeEntryService, TimeEntryService>();
builder.Services.AddScoped<IBillingService, BillingService>();
builder.Services.AddScoped<IExportService, ExportService>();
builder.Services.AddScoped<IImportService, ImportService>();
builder.Services.AddScoped<IWorkDayService, WorkDayService>();
builder.Services.AddScoped<IBreakService, BreakService>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
    
    // Development CORS policy for Vite dev server
    options.AddPolicy("Development", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Ensure database is created and migrated
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<TimekeeperContext>();
    context.Database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("Development");
}
else
{
    app.UseCors();
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SPA fallback - serve index.html for all non-API, non-file routes
// This enables React Router to work correctly
app.MapFallbackToFile("index.html");

app.Run();
