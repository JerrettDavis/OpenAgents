using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using OpenAgents.OrchestratorApi.Background;
using OpenAgents.OrchestratorApi.Data;
using OpenAgents.OrchestratorApi.Endpoints;

namespace OpenAgents.OrchestratorApi.Tests;

/// <summary>
/// Integration tests for the job and metadata endpoints.
/// Uses <see cref="WebApplicationFactory{TEntryPoint}"/> with an in-memory EF Core
/// database to avoid filesystem and Docker dependencies.
/// </summary>
public sealed class JobEndpointsIntegrationTests : IClassFixture<OrchestratorApiFactory>
{
    private readonly OrchestratorApiFactory _factory;
    private readonly HttpClient _client;

    // Server responses are snake_case; use these options for both serialisation and deserialisation.
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    // Local response record types mirroring the API contract
    record TestJobSummary(string Id, string Title, string State, string WorkflowId, string ProviderId);
    record TestJobDetail(string Id, string Title, string State, string WorkflowId, string ProviderId, string WorkflowVersion);
    record TestJobListResponse(TestJobSummary[] Items);
    record TestJobDetailResponse(TestJobDetail Job);
    record TestJobCreateResponse(TestJobDetail Job);
    record TestWorkflowItem(Guid Id, string Slug, string Name, string Version, bool IsEnabled);
    record TestWorkflowListResponse(TestWorkflowItem[] Items);
    record TestEventListResponse(JsonElement[] Items);

    public JobEndpointsIntegrationTests(OrchestratorApiFactory factory)
    {
        _factory = factory;
        _client  = factory.CreateClient();
    }

    /// <summary>POST with snake_case serialisation to match what the real frontend sends.</summary>
    private Task<HttpResponseMessage> PostJsonAsync<T>(string path, T body)
        => _client.PostAsJsonAsync(path, body, _json);

    private async Task<T?> ReadJson<T>(HttpResponseMessage response)
        => await response.Content.ReadFromJsonAsync<T>(_json);

    // ──────────────────────────────────────────────────────────
    // Health
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Get_Healthz_Returns200()
    {
        var response = await _client.GetAsync("/healthz");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Get_V1Health_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ──────────────────────────────────────────────────────────
    // Providers
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Get_Providers_ReturnsSeedData()
    {
        var providers = await _client.GetFromJsonAsync<List<ProviderDto>>("/api/v1/providers", _json);

        Assert.NotNull(providers);
        Assert.NotEmpty(providers);
        Assert.Contains(providers, p => p.ProviderId == "claude-code");
    }

    // ──────────────────────────────────────────────────────────
    // Workflows
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Get_Workflows_ReturnsSeedData()
    {
        var resp = await _client.GetFromJsonAsync<TestWorkflowListResponse>("/api/v1/workflows", _json);

        Assert.NotNull(resp);
        Assert.NotEmpty(resp.Items);
        Assert.Contains(resp.Items, w => w.Slug == "planning");
    }

    // ──────────────────────────────────────────────────────────
    // Jobs — List
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Get_Jobs_ReturnsListEnvelope()
    {
        var resp = await _client.GetFromJsonAsync<TestJobListResponse>("/api/v1/jobs", _json);
        Assert.NotNull(resp);
        Assert.NotNull(resp.Items);
    }

    // ──────────────────────────────────────────────────────────
    // Jobs — Create
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Post_Jobs_ValidRequest_Returns201WithJobDetail()
    {
        var request = new CreateJobRequest(
            Title:           "Integration Test Job",
            Description:     "Created by integration test",
            WorkflowId:      "planning",        // slug lookup
            WorkflowVersion: null,
            ProviderId:      "claude-code",
            Model:           "claude-opus-4-5",
            WorkspacePath:   null,
            Parameters:      null);

        var response = await PostJsonAsync("/api/v1/jobs", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var wrapper = await ReadJson<TestJobCreateResponse>(response);
        Assert.NotNull(wrapper);
        var dto = wrapper.Job;
        Assert.NotNull(dto);
        Assert.Equal("Integration Test Job", dto.Title);
        Assert.Equal("Queued",               dto.State);
        Assert.Equal("planning",             dto.WorkflowId);
        Assert.Equal("claude-code",          dto.ProviderId);
        Assert.NotEqual(string.Empty,        dto.Id);

        // Location header should point to the new job, using the API's relative URI contract
        Assert.Equal($"/api/v1/jobs/{dto.Id}", response.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task Post_Jobs_UnknownWorkflow_Returns400WithErrorEnvelope()
    {
        var request = new CreateJobRequest(
            Title:           "Bad Workflow Job",
            Description:     null,
            WorkflowId:      "nonexistent-workflow",
            WorkflowVersion: null,
            ProviderId:      "claude-code",
            Model:           null,
            WorkspacePath:   null,
            Parameters:      null);

        var response = await PostJsonAsync("/api/v1/jobs", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(_json);
        Assert.True(body.TryGetProperty("error", out var err));
        Assert.True(err.TryGetProperty("code", out _));
        Assert.True(err.TryGetProperty("message", out _));
    }

    [Fact]
    public async Task Post_Jobs_UnknownProvider_Returns400()
    {
        var request = new CreateJobRequest(
            Title:           "Bad Provider Job",
            Description:     null,
            WorkflowId:      "planning",
            WorkflowVersion: null,
            ProviderId:      "nonexistent-provider",
            Model:           null,
            WorkspacePath:   null,
            Parameters:      null);

        var response = await PostJsonAsync("/api/v1/jobs", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ──────────────────────────────────────────────────────────
    // Jobs — Get
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Get_Job_ExistingId_ReturnsWrappedJobDetail()
    {
        // Create a job first
        var createResp = await PostJsonAsync("/api/v1/jobs", new CreateJobRequest(
            "Get Test Job", null, "planning", null, "claude-code", null, null, null));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        var created = await ReadJson<TestJobDetailResponse>(createResp);
        Assert.NotNull(created);
        Assert.NotNull(created.Job);
        var jobId = created.Job.Id;

        // Retrieve it — response is { job: {...} }
        var getResp = await _client.GetAsync($"/api/v1/jobs/{jobId}");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);

        var wrapper = await ReadJson<TestJobDetailResponse>(getResp);
        Assert.NotNull(wrapper);
        Assert.NotNull(wrapper.Job);
        Assert.Equal(jobId, wrapper.Job.Id);
    }

    [Fact]
    public async Task Get_Job_NonExistentId_Returns404WithErrorEnvelope()
    {
        var response = await _client.GetAsync($"/api/v1/jobs/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(_json);
        Assert.True(body.TryGetProperty("error", out _));
    }

    // ──────────────────────────────────────────────────────────
    // Jobs — Log
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Get_JobLog_NewJob_ReturnsAtLeastCreatedEvents()
    {
        var createResp = await PostJsonAsync("/api/v1/jobs", new CreateJobRequest(
            "Log Test Job", null, "planning", null, "claude-code", null, null, null));
        var created = await ReadJson<TestJobCreateResponse>(createResp);
        Assert.NotNull(created);

        var logResp = await _client.GetAsync($"/api/v1/jobs/{created.Job.Id}/log");
        Assert.Equal(HttpStatusCode.OK, logResp.StatusCode);

        var events = await logResp.Content.ReadFromJsonAsync<List<JobEventDto>>(_json);
        Assert.NotNull(events);
        // Should have at least job.created and job.queued events
        Assert.True(events.Count >= 2);
        Assert.Contains(events, e => e.EventType == "job.created");
        Assert.Contains(events, e => e.EventType == "job.queued");
    }

    // ──────────────────────────────────────────────────────────
    // Jobs — Events (paginated JSON endpoint)
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Get_JobEvents_NewJob_ReturnsPaginatedEnvelope()
    {
        var createResp = await PostJsonAsync("/api/v1/jobs", new CreateJobRequest(
            "Events Test Job", null, "planning", null, "claude-code", null, null, null));
        var created = await ReadJson<TestJobCreateResponse>(createResp);
        Assert.NotNull(created);

        var evtResp = await _client.GetAsync($"/api/v1/jobs/{created.Job.Id}/events");
        Assert.Equal(HttpStatusCode.OK, evtResp.StatusCode);

        var body = await evtResp.Content.ReadFromJsonAsync<JsonElement>(_json);
        Assert.True(body.TryGetProperty("items", out var items));
        Assert.True(items.GetArrayLength() >= 2);
    }

    // ──────────────────────────────────────────────────────────
    // Jobs — Stages/Tasks
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Get_JobStages_ReturnsSeededStages()
    {
        var createResp = await PostJsonAsync("/api/v1/jobs", new CreateJobRequest(
            "Stages Test Job", null, "planning", null, "claude-code", null, null, null));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await ReadJson<TestJobCreateResponse>(createResp);
        Assert.NotNull(created);
        Assert.NotNull(created.Job);

        var stagesResp = await _client.GetAsync($"/api/v1/jobs/{created.Job.Id}/stages");
        Assert.Equal(HttpStatusCode.OK, stagesResp.StatusCode);

        var body = await stagesResp.Content.ReadFromJsonAsync<JsonElement>(_json);
        Assert.True(body.TryGetProperty("items", out var items));
        Assert.True(items.GetArrayLength() >= 1);

        var first = items[0];
        Assert.Equal("Planning", first.GetProperty("name").GetString());
        Assert.Equal("NotStarted", first.GetProperty("state").GetString());
    }

    [Fact]
    public async Task Get_JobTasks_FilteredByStage_ReturnsSeededTasks()
    {
        var createResp = await PostJsonAsync("/api/v1/jobs", new CreateJobRequest(
            "Tasks Test Job", null, "planning", null, "claude-code", null, null, null));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await ReadJson<TestJobCreateResponse>(createResp);
        Assert.NotNull(created);
        Assert.NotNull(created.Job);

        var stagesResp = await _client.GetAsync($"/api/v1/jobs/{created.Job.Id}/stages");
        var stagesBody = await stagesResp.Content.ReadFromJsonAsync<JsonElement>(_json);
        var stageId = stagesBody.GetProperty("items")[0].GetProperty("id").GetString();
        Assert.False(string.IsNullOrWhiteSpace(stageId));

        var tasksResp = await _client.GetAsync($"/api/v1/jobs/{created.Job.Id}/tasks?stage_id={stageId}");
        Assert.Equal(HttpStatusCode.OK, tasksResp.StatusCode);

        var tasksBody = await tasksResp.Content.ReadFromJsonAsync<JsonElement>(_json);
        Assert.True(tasksBody.TryGetProperty("items", out var items));
        Assert.True(items.GetArrayLength() >= 1);
        Assert.Equal("NotStarted", items[0].GetProperty("state").GetString());
    }
}

// ──────────────────────────────────────────────────────────────
// Test factory — overrides EF Core to use in-memory SQLite
// ──────────────────────────────────────────────────────────────

/// <summary>
/// <see cref="WebApplicationFactory{TProgram}"/> that replaces the SQLite database
/// with an in-memory EF Core provider and stubs out background services.
/// </summary>
public sealed class OrchestratorApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"oa-test-{Guid.NewGuid():N}";
    private readonly InMemoryDatabaseRoot _dbRoot = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Explicitly set the content root to the project source directory so the
        // test host always finds appsettings.json regardless of where `dotnet test`
        // is invoked (project dir, solution root, or CI working directory).
        // WebApplicationFactory's built-in resolution searches for a subdirectory
        // named after the assembly ("OpenAgents.OrchestratorApi") but the actual
        // directory is "orchestrator-api", so the fallback is unreliable here.
        builder.UseContentRoot(ResolveProjectContentRoot());

        builder.ConfigureServices(services =>
        {
            // Remove the production DbContext registration/configuration so tests
            // use exactly one EF Core provider.
            services.RemoveAll<OrchestratorDbContext>();
            services.RemoveAll<DbContextOptions<OrchestratorDbContext>>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<IDbContextOptionsConfiguration<OrchestratorDbContext>>();

            // Add EF Core InMemory with a unique database per factory instance
            services.AddDbContext<OrchestratorDbContext>(opts =>
                opts.UseInMemoryDatabase(_databaseName, _dbRoot));

            // Remove background services to prevent them running during tests
            RemoveHostedService<JobRunnerService>(services);
            RemoveHostedService<EventWatcherService>(services);
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);

        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<OrchestratorDbContext>();
        db.Database.EnsureCreated();
        SeedData.SeedAsync(db).GetAwaiter().GetResult();

        return host;
    }

    /// <summary>
    /// Walks up from the test binary output directory (AppContext.BaseDirectory)
    /// to find the directory that contains <c>OpenAgents.OrchestratorApi.csproj</c>.
    /// This is necessary because the project lives under <c>apps/orchestrator-api</c>
    /// whose folder name does not match the assembly name, so the default
    /// WebApplicationFactory content-root search algorithm cannot find it.
    /// Falls back to <see cref="AppContext.BaseDirectory"/> as a safety net — the
    /// Web SDK always copies appsettings*.json to the bin output directory.
    /// </summary>
    private static string ResolveProjectContentRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (dir.GetFiles("OpenAgents.OrchestratorApi.csproj").Length > 0)
                return dir.FullName;
            dir = dir.Parent;
        }
        return AppContext.BaseDirectory;
    }

    private static void RemoveHostedService<T>(IServiceCollection services)
        where T : class
    {
        var d = services.SingleOrDefault(s =>
            s.ServiceType == typeof(Microsoft.Extensions.Hosting.IHostedService) &&
            s.ImplementationType == typeof(T));
        if (d is not null) services.Remove(d);
    }
}
