using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenAgents.Domain.Aggregates.Jobs;
using OpenAgents.Domain.Aggregates.Workflows;
using OpenAgents.Domain.Contracts;
using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Data;
using OpenAgents.OrchestratorApi.Infrastructure;
using OpenAgents.OrchestratorApi.Services;

namespace OpenAgents.OrchestratorApi.Endpoints;

// ──────────────────────────────────────────────────────────────
// Request DTOs
// ──────────────────────────────────────────────────────────────

/// <summary>Request body for creating a new job. Field names match the API contract.</summary>
public sealed record CreateJobRequest(
    string Title,
    string? Description,
    /// <summary>Workflow UUID (preferred, from the workflow list) or slug (fallback).</summary>
    string WorkflowId,
    string? WorkflowVersion,
    string ProviderId,
    string? Model,
    string? WorkspacePath,
    Dictionary<string, object?>? Parameters);

// ──────────────────────────────────────────────────────────────
// Response DTOs  (PascalCase here → snake_case on the wire via SnakeCaseLower policy)
// ──────────────────────────────────────────────────────────────

/// <summary>Slim job summary used in list responses. Matches ApiJobSummary contract.</summary>
public sealed record JobSummaryDto(
    string Id,
    string Title,
    string State,
    string Outcome,
    string WorkflowId,          // wire: workflow_id
    string ProviderId,          // wire: provider_id
    DateTime CreatedAtUtc,
    DateTime? StartedAtUtc,
    DateTime? FinishedAtUtc,
    long? DurationMs);          // wire: duration_ms

/// <summary>Full job detail. Matches ApiJobDetail contract.</summary>
public sealed record JobDetailDto(
    string Id,
    string Title,
    string? Description,
    string State,
    string Outcome,
    string ConnectionStatus,
    string WorkflowId,          // wire: workflow_id
    string WorkflowVersion,
    string ProviderId,          // wire: provider_id
    string? Model,
    DateTime CreatedAtUtc,
    DateTime? QueuedAtUtc,
    DateTime? StartedAtUtc,
    DateTime? FinishedAtUtc,
    long? DurationMs,
    string? WorkspacePath,      // wire: workspace_path
    string? CurrentStageId,     // wire: current_stage_id (null until stages are modelled)
    string? CurrentTaskId);     // wire: current_task_id

/// <summary>State-transition action response. Matches ApiJobStateTransitionResponse.</summary>
public sealed record StateTransitionDto(
    string JobId,               // wire: job_id
    string State);

/// <summary>Persisted event mapped to ApiEvent wire shape.</summary>
public sealed record EventDto(
    string SchemaVersion,       // wire: schema_version
    string EventId,             // wire: event_id
    string EventType,           // wire: event_type
    DateTime OccurredAtUtc,     // wire: occurred_at_utc
    DateTime RecordedAtUtc,     // wire: recorded_at_utc
    EventSourceDto Source,
    EventCorrelationDto Correlation,
    string Severity,
    string Title,
    string Summary,
    object? Payload);

public sealed record EventSourceDto(string Kind, string InstanceId); // wire: instance_id
public sealed record EventCorrelationDto(string JobId);              // wire: job_id

/// <summary>Single log line. Matches ApiLogLine.</summary>
public sealed record LogLineDto(
    DateTime Timestamp,
    string AgentId,             // wire: agent_id
    string Stream,
    string Line);

/// <summary>Legacy event DTO kept for the /log endpoint used by integration tests.</summary>
public sealed record JobEventDto(
    Guid Id,
    Guid JobId,
    string EventType,
    string Summary,
    string Source,
    DateTime OccurredAtUtc,
    object? Payload);

public sealed record StageDto(
    string Id,
    string JobId,
    string StageDefinitionId,
    string Name,
    string State,
    string? Outcome,
    int Order,
    bool IsOptional,
    bool IsSkipped,
    int CurrentIteration,
    int MaxIterations,
    DateTime? StartedAtUtc,
    DateTime? FinishedAtUtc);

public sealed record TaskDto(
    string Id,
    string JobId,
    string StageId,
    string Title,
    string? Description,
    string State,
    string? Outcome,
    string Source,
    string? TodoAddress,
    int CurrentIteration,
    int MaxIterations,
    DateTime? StartedAtUtc,
    DateTime? FinishedAtUtc);

public sealed record ArtifactDto(
    string Id,
    string JobId,
    string Path,
    string Name,
    long SizeBytes,
    DateTime LastModifiedUtc,
    bool IsDirectory,
    string Source);

// ──────────────────────────────────────────────────────────────
// Endpoint registration
// ──────────────────────────────────────────────────────────────

public static class JobEndpoints
{
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    /// <summary>
    /// Checks if a provider is compatible with a workflow. For AgentContainers providers
    /// (prefixed with "ac-"), also checks if any of the embedded agent names match
    /// a compatible provider (e.g., "ac-dotnet-codex" matches "codex").
    /// </summary>
    private static bool IsProviderCompatible(
        string providerId,
        IReadOnlyList<WorkflowManifestCompatibility> compatibility)
    {
        // Direct match
        if (compatibility.Any(pc =>
                string.Equals(pc.ProviderId, providerId, StringComparison.OrdinalIgnoreCase) &&
                pc.SupportLevel != ProviderSupportLevel.Unsupported))
            return true;

        // For AC providers, check if any compatible provider ID matches an agent
        // embedded in the AC image name (e.g., "ac-dotnet-claude" matches "claude-code"
        // because segment "claude" is a prefix of "claude-code"; "ac-dotnet-codex"
        // matches "codex" exactly)
        if (providerId.StartsWith("ac-", StringComparison.OrdinalIgnoreCase))
        {
            var segments = providerId["ac-".Length..].Split('-');
            foreach (var pc in compatibility)
            {
                if (pc.SupportLevel == ProviderSupportLevel.Unsupported) continue;
                // Exact segment match (e.g., "codex" in segments matches provider "codex")
                if (segments.Contains(pc.ProviderId, StringComparer.OrdinalIgnoreCase))
                    return true;
                // Prefix match (e.g., segment "claude" matches provider "claude-code")
                if (segments.Any(s => pc.ProviderId.StartsWith(s, StringComparison.OrdinalIgnoreCase)))
                    return true;
            }
        }

        return false;
    }

    public static void MapJobEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/jobs").WithTags("Jobs");

        // ── List ────────────────────────────────────────────
        group.MapGet("", ListJobsAsync)
            .WithName("ListJobs")
            .WithSummary("List all jobs, most-recent first");

        // ── Get ─────────────────────────────────────────────
        group.MapGet("/{id:guid}", GetJobAsync)
            .WithName("GetJob")
            .WithSummary("Get a job by ID");

        // ── Create ──────────────────────────────────────────
        group.MapPost("", CreateJobAsync)
            .WithName("CreateJob")
            .WithSummary("Create and queue a new job");

        // ── State-transition actions ─────────────────────────
        group.MapPost("/{id:guid}/start", StartJobAsync)
            .WithName("StartJob")
            .WithSummary("Enqueue a Pending job for execution");

        group.MapPost("/{id:guid}/stop", StopJobAsync)
            .WithName("StopJob")
            .WithSummary("Stop (fail) a running or paused job");

        group.MapPost("/{id:guid}/archive", ArchiveJobAsync)
            .WithName("ArchiveJob")
            .WithSummary("Archive a completed or errored job");

        // ── Cancel (hard delete-style) ───────────────────────
        group.MapDelete("/{id:guid}", CancelJobAsync)
            .WithName("CancelJob")
            .WithSummary("Cancel (fail) a running or queued job");

        // ── Stages ───────────────────────────────────────────
        group.MapGet("/{id:guid}/stages", ListStagesAsync)
            .WithName("ListStages")
            .WithSummary("List stages for a job (empty in v1)");

        group.MapGet("/{id:guid}/stages/{stageId}", GetStageAsync)
            .WithName("GetStage")
            .WithSummary("Get a stage by ID");

        // ── Tasks ────────────────────────────────────────────
        group.MapGet("/{id:guid}/tasks", ListTasksAsync)
            .WithName("ListTasks")
            .WithSummary("List tasks for a job (empty in v1)");

        // ── Artifacts ────────────────────────────────────────
        group.MapGet("/{id:guid}/artifacts", ListArtifactsAsync)
            .WithName("ListArtifacts")
            .WithSummary("List workspace artifacts for a job");

        // ── Events (JSON paginated list) ─────────────────────
        group.MapGet("/{id:guid}/events", ListJobEventsAsync)
            .WithName("ListJobEvents")
            .WithSummary("Return persisted events for a job as paginated JSON");
        // ── Logs ────────────────────────────────────────────
        group.MapGet("/{id:guid}/logs", ListJobLogsAsync)
            .WithName("ListJobLogs")
            .WithSummary("Return log lines for a job");

        // ── Legacy log endpoint (plain array — used by integration tests) ──
        group.MapGet("/{id:guid}/log", GetJobLogAsync)
            .WithName("GetJobLog")
            .WithSummary("Return raw event list for a job (plain array, test compat)");

        // ── SSE stream ──────────────────────────────────────
        // Registered directly on app (not the group) to keep the /stream prefix clean.
        app.MapGet("/api/v1/stream/jobs/{id:guid}", StreamJobEventsAsync)
            .WithName("StreamJobEvents")
            .WithSummary("Stream live job events via Server-Sent Events")
            .WithTags("Jobs");
    }

    // ──────────────────────────────────────────────────────────
    // Handlers
    // ──────────────────────────────────────────────────────────

    private static async Task<IResult> ListJobsAsync(
        IJobRepository repo,
        CancellationToken ct)
    {
        var jobs = await repo.GetAllAsync(ct);
        var items = jobs.Select(ToSummaryDto).ToList();
        return Results.Ok(Paged(items));
    }

    private static async Task<IResult> GetJobAsync(
        [FromRoute] Guid id,
        IJobRepository repo,
        OrchestratorDbContext db,
        CancellationToken ct)
    {
        var job = await repo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
            return ApiErr(404, "NOT_FOUND", $"Job {id} not found");

        var (currentStageId, currentTaskId) = await ResolveCurrentExecutionIdsAsync(id, db, ct);
        return Results.Ok(new { Job = ToDetailDto(job, currentStageId, currentTaskId) });
    }

    private static async Task<IResult> CreateJobAsync(
        [FromBody] CreateJobRequest request,
        IJobRepository jobRepo,
        IJobEventRepository eventRepo,
        JobEventService eventService,
        OrchestratorDbContext db,
        IWorkflowManifestCatalog workflowCatalog,
        CancellationToken ct)
    {
        // Resolve workflow — accept UUID or slug
        WorkflowDefinition? workflow;
        if (Guid.TryParse(request.WorkflowId, out var wfGuid))
        {
            workflow = await db.WorkflowDefinitions
                .FirstOrDefaultAsync(w => w.Id.Value == wfGuid && w.IsEnabled, ct);
        }
        else
        {
            workflow = await db.WorkflowDefinitions
                .FirstOrDefaultAsync(w => w.Slug == request.WorkflowId && w.IsEnabled, ct);
        }

        if (workflow is null)
            return ApiErr(400, "BAD_REQUEST", $"Workflow '{request.WorkflowId}' not found or disabled");

        // Resolve provider
        var provider = await db.ProviderDefinitions
            .FirstOrDefaultAsync(p => p.ProviderId == request.ProviderId && p.IsEnabled, ct);

        if (provider is null)
            return ApiErr(400, "BAD_REQUEST", $"Provider '{request.ProviderId}' not found or disabled");

        var workflowManifest = workflowCatalog.GetBySlug(workflow.Slug);
        if (workflowManifest is not null &&
            workflowManifest.ProviderCompatibility.Count > 0 &&
            !IsProviderCompatible(provider.ProviderId, workflowManifest.ProviderCompatibility))
        {
            return ApiErr(
                400,
                "BAD_REQUEST",
                $"Provider '{provider.ProviderId}' is not compatible with workflow '{workflow.Slug}'");
        }

        var job = Job.Create(
            title:                request.Title,
            description:          request.Description,
            workflowDefinitionId: workflow.Id.Value,
            workflowSlug:         workflow.Slug,
            workflowVersion:      workflow.Version,
            primaryProviderId:    provider.ProviderId,
            primaryModel:         request.Model);

        job.Queue();

        await jobRepo.AddAsync(job, ct);

        var (stages, tasks) = BuildExecutionPlan(job);
        if (stages.Count > 0)
            db.JobStageExecutions.AddRange(stages);
        if (tasks.Count > 0)
            db.JobTaskExecutions.AddRange(tasks);
        await db.SaveChangesAsync(ct);

        await eventService.EmitAsync(job.Id.Value, JobEvent.Types.JobCreated,
            $"Job '{job.Title}' created", ct: ct);
        await eventService.EmitAsync(job.Id.Value, JobEvent.Types.JobQueued,
            "Job queued for execution", ct: ct);

        var (currentStageId, currentTaskId) = await ResolveCurrentExecutionIdsAsync(job.Id.Value, db, ct);
        return Results.Created($"/api/v1/jobs/{job.Id}", new { Job = ToDetailDto(job, currentStageId, currentTaskId) });
    }

    private static async Task<IResult> StartJobAsync(
        [FromRoute] Guid id,
        IJobRepository repo,
        JobEventService eventService,
        CancellationToken ct)
    {
        var job = await repo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
            return ApiErr(404, "NOT_FOUND", $"Job {id} not found");

        try
        {
            job.Queue();
            await repo.UpdateAsync(job, ct);
            await eventService.EmitAsync(id, JobEvent.Types.JobQueued, "Job queued by user", ct: ct);
            return Results.Ok(new StateTransitionDto(id.ToString(), job.State.ToString()));
        }
        catch (InvalidOperationException ex)
        {
            return ApiErr(409, "CONFLICT", ex.Message);
        }
    }

    private static async Task<IResult> StopJobAsync(
        [FromRoute] Guid id,
        IJobRepository repo,
        JobEventService eventService,
        CancellationToken ct)
    {
        var job = await repo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
            return ApiErr(404, "NOT_FOUND", $"Job {id} not found");

        job.Fail("Stopped by user");
        await repo.UpdateAsync(job, ct);
        await eventService.EmitAsync(id, JobEvent.Types.JobFailed, "Job stopped by user", ct: ct);
        return Results.Ok(new StateTransitionDto(id.ToString(), job.State.ToString()));
    }

    private static async Task<IResult> ArchiveJobAsync(
        [FromRoute] Guid id,
        IJobRepository repo,
        JobEventService eventService,
        CancellationToken ct)
    {
        var job = await repo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
            return ApiErr(404, "NOT_FOUND", $"Job {id} not found");

        job.Archive();
        await repo.UpdateAsync(job, ct);
        await eventService.EmitAsync(id, JobEvent.Types.JobArchived, "Job archived by user", ct: ct);
        return Results.Ok(new StateTransitionDto(id.ToString(), job.State.ToString()));
    }

    private static async Task<IResult> CancelJobAsync(
        [FromRoute] Guid id,
        IJobRepository repo,
        JobEventService eventService,
        CancellationToken ct)
    {
        var job = await repo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
            return ApiErr(404, "NOT_FOUND", $"Job {id} not found");

        try
        {
            job.Fail("Cancelled by user");
            await repo.UpdateAsync(job, ct);
            await eventService.EmitAsync(id, JobEvent.Types.JobFailed,
                "Job cancelled by user", ct: ct);
            return Results.Ok(new { Job = ToDetailDto(job) });
        }
        catch (InvalidOperationException ex)
        {
            return ApiErr(409, "CONFLICT", ex.Message);
        }
    }

    private static async Task<IResult> ListStagesAsync(
        [FromRoute] Guid id,
        IJobRepository repo,
        OrchestratorDbContext db,
        CancellationToken ct)
    {
        var job = await repo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
            return ApiErr(404, "NOT_FOUND", $"Job {id} not found");

        var stages = await db.JobStageExecutions
            .Where(s => s.JobId == id)
            .OrderBy(s => s.Order)
            .ToListAsync(ct);

        return Results.Ok(Paged(stages.Select(ToStageDto)));
    }

    private static async Task<IResult> GetStageAsync(
        [FromRoute] Guid id,
        [FromRoute] string stageId,
        IJobRepository repo,
        OrchestratorDbContext db,
        CancellationToken ct)
    {
        var job = await repo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
            return ApiErr(404, "NOT_FOUND", $"Job {id} not found");

        JobStageExecution? stage;
        if (Guid.TryParse(stageId, out var stageGuid))
        {
            stage = await db.JobStageExecutions
                .FirstOrDefaultAsync(s => s.JobId == id && s.Id == stageGuid, ct);
        }
        else
        {
            stage = await db.JobStageExecutions
                .FirstOrDefaultAsync(s => s.JobId == id && s.StageDefinitionId == stageId, ct);
        }

        return stage is null
            ? ApiErr(404, "NOT_FOUND", $"Stage {stageId} not found for job {id}")
            : Results.Ok(new { Stage = ToStageDto(stage) });
    }

    private static async Task<IResult> ListTasksAsync(
        [FromRoute] Guid id,
        [FromQuery(Name = "stage_id")] string? stageId,
        IJobRepository repo,
        OrchestratorDbContext db,
        CancellationToken ct)
    {
        var job = await repo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
            return ApiErr(404, "NOT_FOUND", $"Job {id} not found");

        var query = db.JobTaskExecutions
            .Where(t => t.JobId == id)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(stageId) && Guid.TryParse(stageId, out var stageGuid))
            query = query.Where(t => t.StageExecutionId == stageGuid);

        var tasks = await query
            .OrderBy(t => t.StageExecutionId)
            .ThenBy(t => t.Title)
            .ToListAsync(ct);

        return Results.Ok(Paged(tasks.Select(ToTaskDto)));
    }

    private static async Task<IResult> ListArtifactsAsync(
        [FromRoute] Guid id,
        [FromQuery(Name = "path")] string? relativePath,
        IJobRepository jobRepo,
        CancellationToken ct)
    {
        var job = await jobRepo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
            return ApiErr(404, "NOT_FOUND", $"Job {id} not found");

        if (string.IsNullOrWhiteSpace(job.WorkspaceHostPath) || !Directory.Exists(job.WorkspaceHostPath))
            return Results.Ok(Paged(Array.Empty<ArtifactDto>()));

        var workspaceRoot = Path.GetFullPath(job.WorkspaceHostPath);
        var requestedPath = string.IsNullOrWhiteSpace(relativePath)
            ? workspaceRoot
            : Path.GetFullPath(Path.Combine(workspaceRoot, relativePath));

        if (!requestedPath.StartsWith(workspaceRoot, StringComparison.OrdinalIgnoreCase))
            return ApiErr(400, "BAD_REQUEST", "Invalid artifact path");

        if (!Directory.Exists(requestedPath))
            return ApiErr(404, "NOT_FOUND", $"Artifact path '{relativePath}' not found");

        var entries = Directory.EnumerateFileSystemEntries(requestedPath)
            .Select(path =>
            {
                var isDir = Directory.Exists(path);
                var info = isDir
                    ? (FileSystemInfo)new DirectoryInfo(path)
                    : new FileInfo(path);

                var rel = Path.GetRelativePath(workspaceRoot, path)
                    .Replace('\\', '/');

                return new ArtifactDto(
                    Id: rel,
                    JobId: id.ToString(),
                    Path: rel,
                    Name: Path.GetFileName(path),
                    SizeBytes: isDir ? 0 : ((FileInfo)info).Length,
                    LastModifiedUtc: info.LastWriteTimeUtc,
                    IsDirectory: isDir,
                    Source: rel.StartsWith(".agent-orch", StringComparison.OrdinalIgnoreCase) ? "orchestrator" : "workspace");
            })
            .OrderByDescending(a => a.IsDirectory)
            .ThenBy(a => a.Name)
            .ToList();

        return Results.Ok(Paged(entries));
    }

    /// <summary>Events endpoint — returns paginated ApiEvent-shaped objects.</summary>
    private static async Task<IResult> ListJobEventsAsync(
        [FromRoute] Guid id,
        IJobRepository jobRepo,
        IJobEventRepository eventRepo,
        CancellationToken ct)
    {
        var job = await jobRepo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
            return ApiErr(404, "NOT_FOUND", $"Job {id} not found");

        var events = await eventRepo.GetByJobIdAsync(id, ct);
        return Results.Ok(Paged(events.Select(ToEventDto)));
    }

    /// <summary>Logs endpoint — returns log lines derived from job.log events.</summary>
    private static async Task<IResult> ListJobLogsAsync(
        [FromRoute] Guid id,
        IJobRepository jobRepo,
        IJobEventRepository eventRepo,
        CancellationToken ct)
    {
        var job = await jobRepo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
            return ApiErr(404, "NOT_FOUND", $"Job {id} not found");

        var events = await eventRepo.GetByJobIdAsync(id, ct);
        var lines = events
            .Where(e => e.EventType is JobEvent.Types.JobLog or JobEvent.Types.AgentLog)
            .Select(e => new LogLineDto(
                Timestamp: e.OccurredAtUtc,
                AgentId:   e.Source,
                Stream:    "stdout",
                Line:      e.Summary));

        return Results.Ok(Paged(lines));
    }

    /// <summary>Legacy plain-array log endpoint — kept for integration-test compatibility.</summary>
    private static async Task<IResult> GetJobLogAsync(
        [FromRoute] Guid id,
        IJobRepository jobRepo,
        IJobEventRepository eventRepo,
        CancellationToken ct)
    {
        var job = await jobRepo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
            return ApiErr(404, "NOT_FOUND", $"Job {id} not found");

        var events = await eventRepo.GetByJobIdAsync(id, ct);
        return Results.Ok(events.Select(ToLegacyEventDto));
    }

    /// <summary>
    /// SSE endpoint at <c>/api/v1/stream/jobs/{id}</c> — streams historical events
    /// then switches to live events from <see cref="SseHub"/>.
    /// </summary>
    private static async Task StreamJobEventsAsync(
        [FromRoute] Guid id,
        IJobRepository jobRepo,
        IJobEventRepository eventRepo,
        SseHub hub,
        HttpContext ctx,
        CancellationToken ct)
    {
        var job = await jobRepo.GetByIdAsync(JobId.From(id), ct);
        if (job is null)
        {
            ctx.Response.StatusCode = StatusCodes.Status404NotFound;
            await ctx.Response.WriteAsJsonAsync(
                new { error = new { code = "NOT_FOUND", message = $"Job {id} not found", detail = (string?)null } }, ct);
            return;
        }

        ctx.Response.Headers.Append("Content-Type", "text/event-stream");
        ctx.Response.Headers.Append("Cache-Control", "no-cache");
        ctx.Response.Headers.Append("Connection", "keep-alive");
        ctx.Response.Headers.Append("X-Accel-Buffering", "no");

        // Subscribe to hub FIRST to buffer any events arriving during history replay.
        var liveStream = hub.SubscribeAsync(id, ct);

        var history = await eventRepo.GetByJobIdAsync(id, ct);
        foreach (var evt in history)
        {
            if (ct.IsCancellationRequested) return;
            await WriteSseEventAsync(ctx, ToLegacyEventDto(evt), ct);
        }

        var terminalStates = new[] { JobState.Completed, JobState.Error, JobState.Archived };
        if (terminalStates.Contains(job.State))
        {
            await ctx.Response.WriteAsync(
                $"event: heartbeat\ndata: {{\"ts\":\"{DateTime.UtcNow:O}\",\"terminal\":true}}\n\n", ct);
            await ctx.Response.Body.FlushAsync(ct);
            return;
        }

        using var heartbeatTimer = new PeriodicTimer(TimeSpan.FromSeconds(15));
        var heartbeatTask = Task.Run(async () =>
        {
            try
            {
                while (await heartbeatTimer.WaitForNextTickAsync(ct))
                {
                    await ctx.Response.WriteAsync(
                        $"event: heartbeat\ndata: {{\"ts\":\"{DateTime.UtcNow:O}\"}}\n\n", ct);
                    await ctx.Response.Body.FlushAsync(ct);
                }
            }
            catch (OperationCanceledException) { }
        }, ct);

        await foreach (var payloadJson in liveStream)
        {
            if (ct.IsCancellationRequested) break;
            await ctx.Response.WriteAsync($"data: {payloadJson}\n\n", ct);
            await ctx.Response.Body.FlushAsync(ct);
        }

        await heartbeatTask.WaitAsync(TimeSpan.FromSeconds(1)).ConfigureAwait(false);
    }

    // ──────────────────────────────────────────────────────────
    // Helpers — error envelope
    // ──────────────────────────────────────────────────────────

    private static IResult ApiErr(int status, string code, string message) =>
        Results.Json(
            new { error = new { code, message, detail = (string?)null } },
            statusCode: status);

    // ──────────────────────────────────────────────────────────
    // Helpers — pagination envelope
    // ──────────────────────────────────────────────────────────

    private static object Paged<T>(IEnumerable<T> source)
    {
        var items = source.ToList();
        return new
        {
            Items      = items,
            Pagination = new
            {
                Total      = items.Count,
                Limit      = items.Count,
                HasMore    = false,
                NextCursor = (string?)null
            }
        };
    }

    // ──────────────────────────────────────────────────────────
    // Helpers — execution planning and DTO mappings
    // ──────────────────────────────────────────────────────────

    private static (List<JobStageExecution> stages, List<JobTaskExecution> tasks) BuildExecutionPlan(Job job)
    {
        var stages = new List<JobStageExecution>();
        var tasks = new List<JobTaskExecution>();

        if (job.WorkflowSlug.Equals("planning", StringComparison.OrdinalIgnoreCase))
        {
            var stage = JobStageExecution.Create(
                jobId: job.Id.Value,
                stageDefinitionId: "plan",
                name: "Planning",
                order: 1,
                isOptional: false,
                maxIterations: 5);

            stages.Add(stage);
            tasks.Add(JobTaskExecution.Create(job.Id.Value, stage.Id, "Analyse requirements", "Review the brief and extract key requirements.", "seed", 3));
            tasks.Add(JobTaskExecution.Create(job.Id.Value, stage.Id, "Create structured plan", "Write a structured implementation plan to TODO.md.", "seed", 3));
            tasks.Add(JobTaskExecution.Create(job.Id.Value, stage.Id, "Write planning report", "Produce a final report in .agent-orch/reports/.", "seed", 3));

            return (stages, tasks);
        }

        var fallbackStage = JobStageExecution.Create(
            jobId: job.Id.Value,
            stageDefinitionId: "main",
            name: "Execution",
            order: 1,
            isOptional: false,
            maxIterations: 1);

        stages.Add(fallbackStage);
        tasks.Add(JobTaskExecution.Create(job.Id.Value, fallbackStage.Id, "Execute workflow", "Run workflow task execution.", "seed", 1));

        return (stages, tasks);
    }

    private static async Task<(string? stageId, string? taskId)> ResolveCurrentExecutionIdsAsync(
        Guid jobId,
        OrchestratorDbContext db,
        CancellationToken ct)
    {
        var stage = await db.JobStageExecutions
            .Where(s => s.JobId == jobId)
            .OrderByDescending(s => s.State == StageExecutionState.Running)
            .ThenBy(s => s.Order)
            .FirstOrDefaultAsync(ct);

        if (stage is null)
            return (null, null);

        var task = await db.JobTaskExecutions
            .Where(t => t.JobId == jobId && t.StageExecutionId == stage.Id)
            .OrderByDescending(t => t.State == TaskExecutionState.Running)
            .ThenBy(t => t.Title)
            .FirstOrDefaultAsync(ct);

        return (stage.Id.ToString(), task?.Id.ToString());
    }

    private static StageDto ToStageDto(JobStageExecution s) => new(
        Id: s.Id.ToString(),
        JobId: s.JobId.ToString(),
        StageDefinitionId: s.StageDefinitionId,
        Name: s.Name,
        State: s.State.ToString(),
        Outcome: s.Outcome,
        Order: s.Order,
        IsOptional: s.IsOptional,
        IsSkipped: s.IsSkipped,
        CurrentIteration: s.CurrentIteration,
        MaxIterations: s.MaxIterations,
        StartedAtUtc: s.StartedAtUtc,
        FinishedAtUtc: s.FinishedAtUtc);

    private static TaskDto ToTaskDto(JobTaskExecution t) => new(
        Id: t.Id.ToString(),
        JobId: t.JobId.ToString(),
        StageId: t.StageExecutionId.ToString(),
        Title: t.Title,
        Description: t.Description,
        State: t.State.ToString(),
        Outcome: t.Outcome,
        Source: t.Source,
        TodoAddress: t.TodoAddress,
        CurrentIteration: t.CurrentIteration,
        MaxIterations: t.MaxIterations,
        StartedAtUtc: t.StartedAtUtc,
        FinishedAtUtc: t.FinishedAtUtc);

    private static JobSummaryDto ToSummaryDto(Job j) => new(
        Id:            j.Id.Value.ToString(),
        Title:         j.Title,
        State:         j.State.ToString(),
        Outcome:       j.Outcome.ToString(),
        WorkflowId:    j.WorkflowSlug,
        ProviderId:    j.PrimaryProviderId,
        CreatedAtUtc:  j.CreatedAtUtc,
        StartedAtUtc:  j.StartedAtUtc,
        FinishedAtUtc: j.FinishedAtUtc,
        DurationMs:    j.Duration.HasValue ? (long)j.Duration.Value.TotalMilliseconds : null);

    private static JobDetailDto ToDetailDto(Job j, string? currentStageId = null, string? currentTaskId = null) => new(
        Id:               j.Id.Value.ToString(),
        Title:            j.Title,
        Description:      j.Description,
        State:            j.State.ToString(),
        Outcome:          j.Outcome.ToString(),
        ConnectionStatus: j.ConnectionStatus.ToString(),
        WorkflowId:       j.WorkflowSlug,
        WorkflowVersion:  j.WorkflowVersion,
        ProviderId:       j.PrimaryProviderId,
        Model:            j.PrimaryModel,
        CreatedAtUtc:     j.CreatedAtUtc,
        QueuedAtUtc:      j.QueuedAtUtc,
        StartedAtUtc:     j.StartedAtUtc,
        FinishedAtUtc:    j.FinishedAtUtc,
        DurationMs:       j.Duration.HasValue ? (long)j.Duration.Value.TotalMilliseconds : null,
        WorkspacePath:    j.WorkspaceHostPath,
        CurrentStageId:   currentStageId,
        CurrentTaskId:    currentTaskId);

    private static EventDto ToEventDto(Domain.Aggregates.Jobs.JobEvent e)
    {
        object? payload = null;
        if (e.PayloadJson is not null)
        {
            try { payload = JsonSerializer.Deserialize<object?>(e.PayloadJson, _json); }
            catch { payload = e.PayloadJson; }
        }

        var severity = e.EventType is JobEvent.Types.JobFailed ? "error" : "info";
        var title    = e.EventType.Replace('.', ' ').Replace('-', ' ');

        return new EventDto(
            SchemaVersion:  "1.0",
            EventId:        e.Id.Value.ToString(),
            EventType:      e.EventType,
            OccurredAtUtc:  e.OccurredAtUtc,
            RecordedAtUtc:  e.RecordedAtUtc,
            Source:         new EventSourceDto(e.Source, "orchestrator"),
            Correlation:    new EventCorrelationDto(e.JobId.ToString()),
            Severity:       severity,
            Title:          title,
            Summary:        e.Summary,
            Payload:        payload);
    }

    /// <summary>Legacy plain-format event used by the /log endpoint and SSE serialization.</summary>
    private static JobEventDto ToLegacyEventDto(Domain.Aggregates.Jobs.JobEvent e)
    {
        object? payload = null;
        if (e.PayloadJson is not null)
        {
            try { payload = JsonSerializer.Deserialize<object?>(e.PayloadJson, _json); }
            catch { payload = e.PayloadJson; }
        }
        return new JobEventDto(e.Id.Value, e.JobId, e.EventType, e.Summary, e.Source, e.OccurredAtUtc, payload);
    }

    private static async Task WriteSseEventAsync(
        HttpContext ctx,
        JobEventDto dto,
        CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(dto, _json);
        await ctx.Response.WriteAsync($"data: {json}\n\n", ct);
        await ctx.Response.Body.FlushAsync(ct);
    }
}
