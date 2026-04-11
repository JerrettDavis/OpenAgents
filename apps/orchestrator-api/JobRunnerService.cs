using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OpenAgents.Domain.Aggregates.Jobs;
using OpenAgents.Domain.Contracts;
using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Data;
using OpenAgents.OrchestratorApi.Infrastructure;
using OpenAgents.OrchestratorApi.Options;
using OpenAgents.OrchestratorApi.Services;

namespace OpenAgents.OrchestratorApi.Background;

/// <summary>
/// Background service that picks up <see cref="JobState.Queued"/> jobs and drives
/// them through the full execution lifecycle:
///
///   Queued → Provisioning → Running → Completed | Error
///
/// v1 behaviour:
///   - Polls for queued jobs every 5 seconds.
///   - Runs each job on a Task (concurrent up to MaxConcurrentJobs).
///   - Provisions the workspace filesystem.
///   - Launches a Docker container via <see cref="IContainerRuntime"/>.
///   - Captures stdout/stderr as JobLog events.
///   - Waits for the container to exit and updates job state.
/// </summary>
public sealed class JobRunnerService : BackgroundService
{
    private const int PollIntervalSeconds   = 5;
    private const int MaxConcurrentJobs     = 3;

    private readonly IServiceScopeFactory  _scopeFactory;
    private readonly IContainerRuntime     _containerRuntime;
    private readonly OrchestratorOptions   _options;
    private readonly ILogger<JobRunnerService> _logger;

    // Tracks jobs currently being processed so we don't double-start them
    private readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, bool> _running = new();

    public JobRunnerService(
        IServiceScopeFactory scopeFactory,
        IContainerRuntime containerRuntime,
        IOptions<OrchestratorOptions> options,
        ILogger<JobRunnerService> logger)
    {
        _scopeFactory     = scopeFactory;
        _containerRuntime = containerRuntime;
        _options          = options.Value;
        _logger           = logger;
    }

    // ──────────────────────────────────────────────────────────
    // BackgroundService
    // ──────────────────────────────────────────────────────────

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("JobRunnerService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DispatchQueuedJobsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error in JobRunnerService dispatch loop");
            }

            await Task.Delay(TimeSpan.FromSeconds(PollIntervalSeconds), stoppingToken);
        }

        _logger.LogInformation("JobRunnerService stopping");
    }

    // ──────────────────────────────────────────────────────────
    // Dispatch
    // ──────────────────────────────────────────────────────────

    private async Task DispatchQueuedJobsAsync(CancellationToken ct)
    {
        if (_running.Count >= MaxConcurrentJobs) return;

        using var scope = _scopeFactory.CreateScope();
        var jobRepo = scope.ServiceProvider.GetRequiredService<IJobRepository>();

        var queuedJobs = await jobRepo.GetByStateAsync(JobState.Queued, ct);

        foreach (var job in queuedJobs)
        {
            if (_running.Count >= MaxConcurrentJobs) break;
            if (_running.ContainsKey(job.Id.Value)) continue;

            _running.TryAdd(job.Id.Value, true);
            // Fire-and-forget — each job runs on its own task
            _ = Task.Run(() => RunJobAsync(job.Id.Value, ct), ct);
        }
    }

    // ──────────────────────────────────────────────────────────
    // Job execution
    // ──────────────────────────────────────────────────────────

    private async Task RunJobAsync(Guid jobId, CancellationToken ct)
    {
        _logger.LogInformation("Starting execution for job {JobId}", jobId);

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var jobRepo      = scope.ServiceProvider.GetRequiredService<IJobRepository>();
            var eventService = scope.ServiceProvider.GetRequiredService<JobEventService>();
            var provisioner  = scope.ServiceProvider.GetRequiredService<IWorkspaceProvisioner>();
            var db           = scope.ServiceProvider.GetRequiredService<OrchestratorDbContext>();

            var job = await jobRepo.GetByIdAsync(
                Domain.Aggregates.Jobs.JobId.From(jobId), ct);

            if (job is null)
            {
                _logger.LogWarning("Job {JobId} not found — skipping", jobId);
                return;
            }

            // ── Resolve workflow name ──────────────────────────
            var workflowName = await db.WorkflowDefinitions
                .Where(w => w.Slug == job.WorkflowSlug)
                .Select(w => w.Name)
                .FirstOrDefaultAsync(ct) ?? job.WorkflowSlug;

            // ── Resolve provider image ─────────────────────────
            var providerImage = await db.ProviderDefinitions
                .Where(p => p.ProviderId == job.PrimaryProviderId)
                .Select(p => p.DockerImage)
                .FirstOrDefaultAsync(ct);

            if (providerImage is null)
            {
                await FailJobAsync(job, jobRepo, eventService,
                    $"Provider '{job.PrimaryProviderId}' not found", ct);
                return;
            }

            // ── Provision workspace ────────────────────────────
            var workspaceId   = Guid.NewGuid();
            var workspacePath = BuildWorkspacePath(job.Id.Value);

            Directory.CreateDirectory(workspacePath);

            job.Provision(workspaceId, workspacePath);
            await jobRepo.UpdateAsync(job, ct);
            await eventService.EmitAsync(jobId, JobEvent.Types.JobProvisioning,
                $"Provisioning workspace at {workspacePath}", ct: ct);

            await provisioner.ProvisionAsync(job, workflowName, ct);

            // ── Launch container ───────────────────────────────
            var containerName = $"openagents-job-{jobId:N}";
            var envVars = BuildEnvironmentVariables(job);

            var containerRequest = new ContainerStartRequest(
                Image:                   providerImage,
                ContainerName:           containerName,
                WorkspaceHostPath:       workspacePath,
                WorkspaceContainerPath:  $"/workspace/{SanitiseName(job.Title)}",
                EnvironmentVariables:    envVars);

            string containerId;
            try
            {
                containerId = await _containerRuntime.StartContainerAsync(containerRequest, ct);
            }
            catch (Exception ex)
            {
                await FailJobAsync(job, jobRepo, eventService,
                    $"Failed to start container: {ex.Message}", ct);
                return;
            }

            job.Start(containerId);
            await jobRepo.UpdateAsync(job, ct);
            await eventService.EmitAsync(jobId, JobEvent.Types.JobStarted,
                $"Container {containerId[..Math.Min(12, containerId.Length)]} started", ct: ct);

            var activeStage = await db.JobStageExecutions
                .Where(s => s.JobId == jobId)
                .OrderBy(s => s.Order)
                .FirstOrDefaultAsync(ct);

            JobTaskExecution? activeTask = null;

            if (activeStage is not null)
            {
                activeStage.Start();
                await eventService.EmitAsync(jobId, "stage.started",
                    $"Stage '{activeStage.Name}' started", ct: ct);

                activeTask = await db.JobTaskExecutions
                    .Where(t => t.JobId == jobId && t.StageExecutionId == activeStage.Id)
                    .OrderBy(t => t.Title)
                    .FirstOrDefaultAsync(ct);

                if (activeTask is not null)
                {
                    activeTask.Start();
                    await eventService.EmitAsync(jobId, "task.started",
                        $"Task '{activeTask.Title}' started", ct: ct);
                }

                await db.SaveChangesAsync(ct);
            }

            // ── Capture logs in background ─────────────────────
            using var logCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            var logTask = CaptureLogsAsync(jobId, containerId, eventService, logCts.Token);

            // ── Wait for container exit ────────────────────────
            int exitCode;
            try
            {
                exitCode = await _containerRuntime.WaitForContainerAsync(containerId, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error waiting for container {ContainerId}", containerId);
                exitCode = -1;
            }

            // Cancel log streaming once container exits
            await logCts.CancelAsync();
            try { await logTask; } catch (OperationCanceledException) { }

            // ── Update final state ─────────────────────────────
            // Re-fetch to avoid stale state
            job = await jobRepo.GetByIdAsync(Domain.Aggregates.Jobs.JobId.From(jobId), ct)
                  ?? job;

            if (exitCode == 0)
            {
                var runningTask = await db.JobTaskExecutions
                    .Where(t => t.JobId == jobId && t.State == TaskExecutionState.Running)
                    .OrderBy(t => t.StartedAtUtc)
                    .FirstOrDefaultAsync(ct);
                if (runningTask is not null)
                {
                    runningTask.Complete();
                    await eventService.EmitAsync(jobId, "task.completed",
                        $"Task '{runningTask.Title}' completed", ct: ct);
                }

                var runningStage = await db.JobStageExecutions
                    .Where(s => s.JobId == jobId && s.State == StageExecutionState.Running)
                    .OrderBy(s => s.Order)
                    .FirstOrDefaultAsync(ct);
                if (runningStage is not null)
                {
                    runningStage.Complete();
                    await eventService.EmitAsync(jobId, "stage.completed",
                        $"Stage '{runningStage.Name}' completed", ct: ct);
                }

                await db.SaveChangesAsync(ct);

                job.Complete(Domain.Enums.JobOutcome.CompletedSuccessfully);
                await jobRepo.UpdateAsync(job, ct);
                await eventService.EmitAsync(jobId, JobEvent.Types.JobCompleted,
                    $"Job completed successfully (exit 0)", ct: ct);
            }
            else
            {
                var runningTask = await db.JobTaskExecutions
                    .Where(t => t.JobId == jobId && t.State == TaskExecutionState.Running)
                    .OrderBy(t => t.StartedAtUtc)
                    .FirstOrDefaultAsync(ct);
                if (runningTask is not null)
                {
                    runningTask.Fail($"exit:{exitCode}");
                    await eventService.EmitAsync(jobId, "task.failed",
                        $"Task '{runningTask.Title}' failed", ct: ct);
                }

                var runningStage = await db.JobStageExecutions
                    .Where(s => s.JobId == jobId && s.State == StageExecutionState.Running)
                    .OrderBy(s => s.Order)
                    .FirstOrDefaultAsync(ct);
                if (runningStage is not null)
                {
                    runningStage.Fail($"exit:{exitCode}");
                    await eventService.EmitAsync(jobId, "stage.failed",
                        $"Stage '{runningStage.Name}' failed", ct: ct);
                }

                await db.SaveChangesAsync(ct);

                job.Fail($"Container exited with code {exitCode}");
                await jobRepo.UpdateAsync(job, ct);
                await eventService.EmitAsync(jobId, JobEvent.Types.JobFailed,
                    $"Job failed — container exit code {exitCode}", ct: ct);
            }

            // Signal SSE clients that the stream is done
            scope.ServiceProvider.GetRequiredService<SseHub>().CompleteJobStream(jobId);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            _logger.LogInformation("Job {JobId} runner cancelled", jobId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error running job {JobId}", jobId);
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var jobRepo      = scope.ServiceProvider.GetRequiredService<IJobRepository>();
                var eventService = scope.ServiceProvider.GetRequiredService<JobEventService>();
                var job = await jobRepo.GetByIdAsync(
                    Domain.Aggregates.Jobs.JobId.From(jobId), ct);
                if (job is not null)
                    await FailJobAsync(job, jobRepo, eventService, ex.Message, ct);
            }
            catch { /* best-effort */ }
        }
        finally
        {
            _running.TryRemove(jobId, out _);
        }
    }

    private async Task CaptureLogsAsync(
        Guid jobId,
        string containerId,
        JobEventService eventService,
        CancellationToken ct)
    {
        try
        {
            await foreach (var line in _containerRuntime.StreamLogsAsync(containerId, ct))
            {
                if (string.IsNullOrEmpty(line)) continue;
                await eventService.EmitAsync(
                    jobId,
                    JobEvent.Types.JobLog,
                    line,
                    source: "agent",
                    ct: ct);
            }
        }
        catch (OperationCanceledException) { /* expected on job completion */ }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error capturing logs for job {JobId}", jobId);
        }
    }

    private static async Task FailJobAsync(
        Domain.Aggregates.Jobs.Job job,
        IJobRepository jobRepo,
        JobEventService eventService,
        string reason,
        CancellationToken ct)
    {
        try { job.Fail(reason); } catch { /* guard against state already Terminal */ }
        await jobRepo.UpdateAsync(job, ct);
        await eventService.EmitAsync(job.Id.Value, JobEvent.Types.JobFailed,
            $"Job failed: {reason}", ct: ct);
    }

    // ──────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────

    private string BuildWorkspacePath(Guid jobId)
        => Path.GetFullPath(Path.Combine(_options.Storage.WorkspaceBasePath, jobId.ToString("N")));

    private static IReadOnlyDictionary<string, string> BuildEnvironmentVariables(
        Domain.Aggregates.Jobs.Job job)
    {
        var vars = new Dictionary<string, string>
        {
            ["JOB_ID"]              = job.Id.Value.ToString(),
            ["WORKFLOW_ID"]         = job.WorkflowSlug,
            ["WORKFLOW_VERSION"]    = job.WorkflowVersion,
            ["STAGE_ID"]            = "setup",
            ["TASK_ID"]             = "task-001",
            ["PROVIDER_ID"]         = job.PrimaryProviderId,
            ["PRIMARY_MODEL"]       = job.PrimaryModel ?? string.Empty,
            ["ITERATIONS"]          = "5",
            ["ITERATIONS__STAGE"]   = "3",
            ["ITERATIONS__TASK"]    = "2",
            ["WORKSPACE_PATH"]      = $"/workspace/{SanitiseName(job.Title)}",
            ["MAILBOX_PATH"]        = $"/workspace/{SanitiseName(job.Title)}/.mailbox",
        };

        // Forward the Anthropic API key from the orchestrator's own process environment
        // into the agent container. The key is set on the orchestrator via the compose
        // env / .env file and must never be hard-coded.
        // DockerCliRuntime redacts this key in its log output so the value never appears
        // in structured logs.
        var anthropicKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
        if (!string.IsNullOrEmpty(anthropicKey))
            vars["ANTHROPIC_API_KEY"] = anthropicKey;

        return vars;
    }

    /// <summary>Make a job title safe for use as a directory/container name component.</summary>
    private static string SanitiseName(string title)
    {
        // 1. Replace all non-alphanumeric characters with hyphens
        // 2. Trim leading/trailing hyphens from the result
        // 3. Truncate to 50 characters
        // BUG FIX: previously called Trim() on `safe` but measured length from TrimStart(),
        // which could produce an out-of-range slice when trailing hyphens made the trimmed
        // string shorter than the TrimStart length.
        var safe = new string(title
            .ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray())
            .Trim('-');
        return safe[..Math.Min(50, safe.Length)];
    }
}
