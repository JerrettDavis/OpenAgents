using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OpenAgents.Domain.Contracts;
using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Background;
using OpenAgents.OrchestratorApi.Data;
using OpenAgents.OrchestratorApi.Endpoints;
using OpenAgents.OrchestratorApi.Infrastructure;
using OpenAgents.OrchestratorApi.Infrastructure.AgentContainers;
using OpenAgents.OrchestratorApi.Options;
using OpenAgents.OrchestratorApi.Repositories;
using OpenAgents.OrchestratorApi.Services;

// Track startup time for uptime reporting
var startedAt = DateTime.UtcNow;

var builder = WebApplication.CreateBuilder(args);

// Load .env file for local credentials (API keys, tokens).
// DotNetEnv.Env.Load() sets process environment variables by default,
// which is how ProviderLaunchEnvironmentBuilder reads passthrough credentials.
var envFile = Path.Combine(builder.Environment.ContentRootPath, ".env");
if (File.Exists(envFile))
    DotNetEnv.Env.Load(envFile);

// ──────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────

builder.Services.Configure<OrchestratorOptions>(
    builder.Configuration.GetSection(OrchestratorOptions.SectionName));

builder.Services.AddSingleton(sp =>
    sp.GetRequiredService<IOptions<OrchestratorOptions>>().Value);

// ── Provider catalog: filesystem + optional AgentContainers registry ──
builder.Services.AddSingleton<FileSystemProviderManifestCatalog>();

var acOptions = builder.Configuration
    .GetSection($"{OrchestratorOptions.SectionName}:AgentContainers")
    .Get<AgentContainersOptions>() ?? new();

if (acOptions is { Enabled: true, Mode: "local" } && !string.IsNullOrWhiteSpace(acOptions.LocalRepoPath))
{
    if (acOptions.LoadEnvMetadataFromDefinitions)
        builder.Services.AddSingleton<IAgentContainersEnvMetadataLoader, YamlDefinitionsEnvMetadataLoader>();
    else
        builder.Services.AddSingleton<IAgentContainersEnvMetadataLoader, NullEnvMetadataLoader>();

    builder.Services.AddSingleton<LocalFileAgentContainersCatalog>();
    builder.Services.AddSingleton<IProviderManifestCatalog>(sp => new CompositeProviderManifestCatalog([
        sp.GetRequiredService<FileSystemProviderManifestCatalog>(),
        sp.GetRequiredService<LocalFileAgentContainersCatalog>()
    ]));
}
else if (acOptions is { Enabled: true, Mode: "remote" })
{
    builder.Services.AddHttpClient("AgentContainers");
    builder.Services.AddSingleton<RemoteAgentContainersCatalog>();
    builder.Services.AddSingleton<IProviderManifestCatalog>(sp => new CompositeProviderManifestCatalog([
        sp.GetRequiredService<FileSystemProviderManifestCatalog>(),
        sp.GetRequiredService<RemoteAgentContainersCatalog>()
    ]));
}
else
{
    builder.Services.AddSingleton<IProviderManifestCatalog>(sp =>
        sp.GetRequiredService<FileSystemProviderManifestCatalog>());
}

builder.Services.AddSingleton<IWorkflowManifestCatalog, FileSystemWorkflowManifestCatalog>();

// ──────────────────────────────────────────────────────────────
// Persistence — EF Core + SQLite
// ──────────────────────────────────────────────────────────────

builder.Services.AddDbContext<OrchestratorDbContext>(opts =>
{
    var connectionString = builder.Configuration.GetConnectionString("OpenAgents")
        ?? "Data Source=./openagents-local.db";
    opts.UseSqlite(connectionString);
});

// ──────────────────────────────────────────────────────────────
// Domain repositories
// ──────────────────────────────────────────────────────────────

builder.Services.AddScoped<IJobRepository, JobRepository>();
builder.Services.AddScoped<IJobEventRepository, JobEventRepository>();

// ──────────────────────────────────────────────────────────────
// Infrastructure services
// ──────────────────────────────────────────────────────────────

// Container runtime: prefer LocalSimRuntime when UseLocalSimRuntime:true in config
// (avoids Docker requirement for local pipeline development).
var useLocalSim = builder.Configuration
    .GetSection(OrchestratorOptions.SectionName)
    .GetValue<bool>("UseLocalSimRuntime");

if (useLocalSim)
    builder.Services.AddSingleton<IContainerRuntime, LocalSimRuntime>();
else
    builder.Services.AddSingleton<IContainerRuntime, DockerCliRuntime>();

builder.Services.AddScoped<IWorkspaceProvisioner, WorkspaceProvisioner>();
builder.Services.AddScoped<JobEventService>();

// SSE hub is singleton — one instance fans out to all connected clients
builder.Services.AddSingleton<SseHub>();

// ──────────────────────────────────────────────────────────────
// Background services
// ──────────────────────────────────────────────────────────────

builder.Services.AddHostedService<JobRunnerService>();
builder.Services.AddHostedService<EventWatcherService>();

// ──────────────────────────────────────────────────────────────
// API infrastructure
// ──────────────────────────────────────────────────────────────

builder.Services.AddOpenApi();

// JSON: snake_case property names (matches API contract and frontend expectations)
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy        = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
    o.SerializerOptions.PropertyNameCaseInsensitive = true;
    o.SerializerOptions.DefaultIgnoreCondition      =
        System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("LocalDev", policy =>
    {
        var origins = builder.Configuration
            .GetSection($"{OrchestratorOptions.SectionName}:Api:CorsOrigins")
            .Get<string[]>() ?? [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001"
            ];

        policy
            .WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// ──────────────────────────────────────────────────────────────
// Database initialisation
// ──────────────────────────────────────────────────────────────

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<OrchestratorDbContext>();
    var workflowCatalog = scope.ServiceProvider.GetRequiredService<IWorkflowManifestCatalog>();
    var providerCatalog = scope.ServiceProvider.GetRequiredService<IProviderManifestCatalog>();

    // EnsureCreated creates the schema from the model without running migrations.
    // Switch to db.Database.MigrateAsync() when migrations are introduced (post-v1).
    await db.Database.EnsureCreatedAsync();

    await SeedData.SeedAsync(db, workflowCatalog, providerCatalog);
}

// ──────────────────────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────────────────────

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("LocalDev");

// ──────────────────────────────────────────────────────────────
// Endpoints
// ──────────────────────────────────────────────────────────────

// Health (Docker healthcheck — keep at /healthz so docker-compose probe still works)
app.MapGet("/healthz", () => Results.Ok(new
    {
        Status  = "healthy",
        Utc     = DateTime.UtcNow,
        Version = typeof(Program).Assembly.GetName().Version?.ToString() ?? "0.0.0"
    }))
   .WithName("Health")
   .WithTags("System");

// v1 health — called by the frontend systemApi.health()
app.MapGet("/api/v1/health", () => Results.Ok(new
    {
        Status          = "healthy",
        Version         = typeof(Program).Assembly.GetName().Version?.ToString() ?? "0.0.0",
        UptimeSeconds   = (long)(DateTime.UtcNow - startedAt).TotalSeconds,
        DockerAvailable = false,   // runtime detection added in a later milestone
        DbConnected     = true
    }))
   .WithName("HealthV1")
   .WithTags("System");

// v1 system info — called by the frontend systemApi.info()
app.MapGet("/api/v1/system/info", async (
    OrchestratorDbContext db,
    OrchestratorOptions opts,
    CancellationToken ct) =>
{
    var providers = await db.ProviderDefinitions
        .Where(p => p.IsEnabled)
        .Select(p => p.ProviderId)
        .ToListAsync(ct);

    var workflows = await db.WorkflowDefinitions
        .Where(w => w.IsEnabled)
        .Select(w => w.Slug)
        .ToListAsync(ct);

    var activeJobs = await db.Jobs
        .CountAsync(j =>
            j.State != JobState.Completed &&
            j.State != JobState.Error &&
            j.State != JobState.Archived, ct);

    return Results.Ok(new
    {
        Version         = typeof(Program).Assembly.GetName().Version?.ToString() ?? "0.0.0",
        ProvidersLoaded = providers,
        WorkflowsLoaded = workflows,
        ActiveJobs      = activeJobs,
        WorkspaceRoot   = opts.Storage.WorkspaceBasePath
    });
})
.WithName("SystemInfo")
.WithTags("System");

// Core resource endpoints
app.MapJobEndpoints();
app.MapProviderEndpoints();
app.MapWorkflowEndpoints();

// ──────────────────────────────────────────────────────────────
// SPA Proxy (development only)
// ──────────────────────────────────────────────────────────────

// SPA: in development, launch Next.js dev server and proxy non-API requests to it.
// Disabled during integration tests (WebApplicationFactory sets SUPPRESS_SPA_PROXY=true).
var suppressSpa = app.Configuration.GetValue<bool>("SUPPRESS_SPA_PROXY")
    || !app.Configuration.GetValue<bool>($"{OrchestratorOptions.SectionName}:SpaProxy");
if (app.Environment.IsDevelopment() && !suppressSpa)
{
    // Only proxy to the SPA for requests that don't match API routes
    app.MapWhen(
        context => !context.Request.Path.StartsWithSegments("/api") &&
                   !context.Request.Path.StartsWithSegments("/healthz"),
        spaApp =>
        {
            spaApp.UseSpa(spa =>
            {
                spa.Options.SourcePath = Path.Combine(app.Environment.ContentRootPath, "..", "..", "apps", "orchestrator-web");
                spa.UseNextJsDevelopmentServer(npmScript: "dev", port: 3000, packageManager: "pnpm");
            });
        });
}

app.Run();

// Make Program accessible to WebApplicationFactory in integration tests
public partial class Program { }


