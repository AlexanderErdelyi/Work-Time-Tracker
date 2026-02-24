using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
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
builder.Services.AddScoped<IWindowsDirectoryAuthService, WindowsDirectoryAuthService>();

var authenticationBuilder = builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = HeaderAuthenticationHandler.SchemeName;
    options.DefaultChallengeScheme = HeaderAuthenticationHandler.SchemeName;
})
.AddCookie("ExternalCookie")
.AddScheme<AuthenticationSchemeOptions, HeaderAuthenticationHandler>(
    HeaderAuthenticationHandler.SchemeName,
    _ => { })
.AddNegotiate();

var githubClientId = builder.Configuration["Authentication:GitHub:ClientId"];
var githubClientSecret = builder.Configuration["Authentication:GitHub:ClientSecret"];
if (!string.IsNullOrWhiteSpace(githubClientId) && !string.IsNullOrWhiteSpace(githubClientSecret))
{
    authenticationBuilder
        .AddOAuth("GitHub", options =>
        {
            options.ClientId = githubClientId;
            options.ClientSecret = githubClientSecret;
            options.CallbackPath = "/signin-github";
            options.AuthorizationEndpoint = "https://github.com/login/oauth/authorize";
            options.TokenEndpoint = "https://github.com/login/oauth/access_token";
            options.UserInformationEndpoint = "https://api.github.com/user";
            options.SignInScheme = "ExternalCookie";
            options.SaveTokens = true;

            options.Scope.Add("user:email");
            options.ClaimActions.MapJsonKey("id", "id");
            options.ClaimActions.MapJsonKey("name", "name");
            options.ClaimActions.MapJsonKey("login", "login");
            options.ClaimActions.MapJsonKey("email", "email");

            options.Events.OnCreatingTicket = async context =>
            {
                var userInfoRequest = new HttpRequestMessage(HttpMethod.Get, context.Options.UserInformationEndpoint);
                userInfoRequest.Headers.UserAgent.ParseAdd("Timekeeper");
                userInfoRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                userInfoRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", context.AccessToken);

                var response = await context.Backchannel.SendAsync(
                    userInfoRequest,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.HttpContext.RequestAborted);
                response.EnsureSuccessStatusCode();

                using var payload = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                context.RunClaimActions(payload.RootElement);

                var email = payload.RootElement.TryGetProperty("email", out var emailElement)
                    ? emailElement.GetString()
                    : null;

                if (string.IsNullOrWhiteSpace(email))
                {
                    var emailsRequest = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user/emails");
                    emailsRequest.Headers.UserAgent.ParseAdd("Timekeeper");
                    emailsRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                    emailsRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", context.AccessToken);

                    var emailsResponse = await context.Backchannel.SendAsync(
                        emailsRequest,
                        HttpCompletionOption.ResponseHeadersRead,
                        context.HttpContext.RequestAborted);
                    emailsResponse.EnsureSuccessStatusCode();
                    using var emailsPayload = System.Text.Json.JsonDocument.Parse(await emailsResponse.Content.ReadAsStringAsync());
                    var primaryEmail = emailsPayload.RootElement.EnumerateArray()
                        .FirstOrDefault(item => item.TryGetProperty("primary", out var primary) && primary.GetBoolean());

                    if (primaryEmail.ValueKind != System.Text.Json.JsonValueKind.Undefined &&
                        primaryEmail.TryGetProperty("email", out var primaryEmailValue))
                    {
                        email = primaryEmailValue.GetString();
                    }
                }

                if (!string.IsNullOrWhiteSpace(email))
                {
                    context.Identity?.AddClaim(new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, email));
                }
            };
        });
}

var microsoftClientId = builder.Configuration["Authentication:Microsoft:ClientId"];
var microsoftClientSecret = builder.Configuration["Authentication:Microsoft:ClientSecret"];
if (!string.IsNullOrWhiteSpace(microsoftClientId) && !string.IsNullOrWhiteSpace(microsoftClientSecret))
{
    authenticationBuilder
        .AddMicrosoftAccount("Microsoft", options =>
        {
            options.ClientId = microsoftClientId;
            options.ClientSecret = microsoftClientSecret;
            options.SignInScheme = "ExternalCookie";
            options.CallbackPath = "/signin-microsoft";
            options.SaveTokens = true;
        });
}

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
builder.Services.AddSingleton<IPasswordHashService, PasswordHashService>();

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
    var passwordHashService = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();
    context.Database.Migrate();

    var localAdmin = context.Users
        .IgnoreQueryFilters()
        .FirstOrDefault(u => u.Email == "admin@local.timekeeper");

    if (localAdmin != null)
    {
        localAdmin.PasswordHash = passwordHashService.HashPassword("admin");
        localAdmin.UpdatedAt = DateTime.UtcNow;
        context.SaveChanges();
    }
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
app.MapFallbackToFile("index.html").AllowAnonymous();

app.Run();
