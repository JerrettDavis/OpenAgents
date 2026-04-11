using OpenAgents.Domain.Enums;
using OpenAgents.Domain.Contracts;
using OpenAgents.OrchestratorApi.Services;

namespace OpenAgents.OrchestratorApi.Background;

/// <summary>
/// Background service that watches the <c>.agent-orch/events/</c> directory
/// of each Running job for new JSON event files written by agent containers.
///
/// v1 event pipeline (from EVENT-SCHEMAS.md):
///   Agent container → writes .json file → FileSystemWatcher detects →
///   Orchestrator ingests → DB append → SSE broadcast
///
/// Files are never deleted by the orchestrator (append-only contract).
/// </summary>
public sealed class EventWatcherService : BackgroundService
{
    private const int PollIntervalSeconds = 10;

    /// <summary>
    /// Maximum number of bytes we will read from a single agent event file.
    /// Files larger than this are rejected to prevent a runaway agent from
    /// exhausting orchestrator memory.
    /// </summary>
    private const long MaxEventFileSizeBytes = 1 * 1024 * 1024; // 1 MB

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EventWatcherService> _logger;

    // jobId → FileSystemWatcher
    private readonly Dictionary<Guid, FileSystemWatcher> _watchers = new();
    // jobId → set of already-processed file paths (to prevent double-ingestion)
    private readonly Dictionary<Guid, HashSet<string>> _processed = new();

    public EventWatcherService(
        IServiceScopeFactory scopeFactory,
        ILogger<EventWatcherService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
    }

    // ──────────────────────────────────────────────────────────
    // BackgroundService
    // ──────────────────────────────────────────────────────────

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("EventWatcherService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RefreshWatchersAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "EventWatcherService error");
            }

            await Task.Delay(TimeSpan.FromSeconds(PollIntervalSeconds), stoppingToken);
        }

        // Dispose all watchers on shutdown
        foreach (var watcher in _watchers.Values)
            watcher.Dispose();

        _logger.LogInformation("EventWatcherService stopped");
    }

    // ──────────────────────────────────────────────────────────
    // Watcher management
    // ──────────────────────────────────────────────────────────

    private async Task RefreshWatchersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var jobRepo = scope.ServiceProvider.GetRequiredService<IJobRepository>();

        var runningJobs = await jobRepo.GetByStateAsync(JobState.Running, ct);

        // Start watchers for newly running jobs
        foreach (var job in runningJobs)
        {
            if (_watchers.ContainsKey(job.Id.Value)) continue;
            if (job.WorkspaceHostPath is null) continue;

            var eventsDir = Path.Combine(job.WorkspaceHostPath, ".agent-orch", "events");

            if (!Directory.Exists(eventsDir))
            {
                _logger.LogDebug("Events dir not yet created for job {JobId}", job.Id);
                continue;
            }

            StartWatcher(job.Id.Value, eventsDir);
        }

        // Stop watchers for jobs that are no longer running
        var runningIds = runningJobs.Select(j => j.Id.Value).ToHashSet();
        var toRemove = _watchers.Keys.Where(id => !runningIds.Contains(id)).ToList();

        foreach (var id in toRemove)
        {
            if (_watchers.Remove(id, out var watcher))
                watcher.Dispose();
            _processed.Remove(id);
            _logger.LogDebug("Stopped watching events for job {JobId}", id);
        }
    }

    private void StartWatcher(Guid jobId, string eventsDir)
    {
        _logger.LogInformation("Watching events dir for job {JobId}: {Dir}", jobId, eventsDir);
        _processed[jobId] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Process any files already present
        _ = Task.Run(() => ProcessExistingFilesAsync(jobId, eventsDir, CancellationToken.None));

        var watcher = new FileSystemWatcher(eventsDir, "*.json")
        {
            NotifyFilter           = NotifyFilters.FileName | NotifyFilters.LastWrite,
            IncludeSubdirectories  = false,
            EnableRaisingEvents    = true
        };

        watcher.Created += (_, e) => OnEventFileCreated(jobId, e.FullPath);
        watcher.Error   += (_, e) => _logger.LogWarning(
            e.GetException(), "FileSystemWatcher error for job {JobId}", jobId);

        _watchers[jobId] = watcher;
    }

    // ──────────────────────────────────────────────────────────
    // File ingestion
    // ──────────────────────────────────────────────────────────

    private void OnEventFileCreated(Guid jobId, string filePath)
    {
        _ = Task.Run(() => IngestEventFileAsync(jobId, filePath, CancellationToken.None));
    }

    private async Task ProcessExistingFilesAsync(Guid jobId, string eventsDir, CancellationToken ct)
    {
        try
        {
            foreach (var file in Directory.EnumerateFiles(eventsDir, "*.json"))
                await IngestEventFileAsync(jobId, file, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error processing existing event files for job {JobId}", jobId);
        }
    }

    private async Task IngestEventFileAsync(Guid jobId, string filePath, CancellationToken ct)
    {
        // Idempotency guard
        if (_processed.TryGetValue(jobId, out var seen) && !seen.Add(filePath))
            return;

        // ── Path-traversal guard ──────────────────────────────────────────────
        // Lexically resolve any '..' or '.' segments so a crafted file name cannot
        // escape the watched events directory (e.g. via a symlink or relative path).
        var resolvedPath = Path.GetFullPath(filePath);
        if (_watchers.TryGetValue(jobId, out var watcher))
        {
            var watchedDir = Path.GetFullPath(watcher.Path)
                                 .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                             + Path.DirectorySeparatorChar;

            if (!resolvedPath.StartsWith(watchedDir, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning(
                    "Ignoring event file outside watched directory (possible path traversal): {File}",
                    resolvedPath);
                return;
            }
        }

        try
        {
            // ── Symlink / reparse-point guard ─────────────────────────────────
            // Path.GetFullPath (above) resolves '..' segments but does NOT
            // follow symbolic links. A malicious agent could place a symlink
            // inside the watched events directory that points to an arbitrary
            // host path, bypassing the directory-containment check.
            // Reject any file whose FileAttributes includes ReparsePoint
            // (covers symlinks and NTFS junctions on Windows as well as
            // symlinks on Linux/macOS bind-mounts).
            //
            // Note: GetAttributes throws if the path does not exist, so we
            // use FileInfo first to guard against the race where the file
            // disappears between detection and ingestion.
            var fileInfo = new FileInfo(resolvedPath);
            if (!fileInfo.Exists)
                return;

            if (fileInfo.Attributes.HasFlag(FileAttributes.ReparsePoint))
            {
                _logger.LogWarning(
                    "Ignoring event file that is a symlink or reparse point: {File}",
                    Path.GetFileName(resolvedPath));
                return;
            }

            // ── Size cap ─────────────────────────────────────────────────────
            // Check size before reading to prevent a large file from exhausting
            // orchestrator heap. FileInfo is a stat-only call with no file read.

            if (fileInfo.Length > MaxEventFileSizeBytes)
            {
                _logger.LogWarning(
                    "Ignoring event file exceeding {CapMb} MB size cap ({Bytes} bytes): {File}",
                    MaxEventFileSizeBytes / (1024 * 1024),
                    fileInfo.Length,
                    Path.GetFileName(resolvedPath));
                return;
            }

            // Brief retry loop in case the file is still being written
            string? content = null;
            for (var attempt = 0; attempt < 3; attempt++)
            {
                try
                {
                    content = await File.ReadAllTextAsync(resolvedPath, ct);
                    break;
                }
                catch (IOException)
                {
                    await Task.Delay(50 * (attempt + 1), ct);
                }
            }

            if (content is null) return;

            using var scope = _scopeFactory.CreateScope();
            var eventService = scope.ServiceProvider.GetRequiredService<JobEventService>();
            await eventService.IngestAgentEventFileAsync(jobId, content, ct);

            _logger.LogDebug("Ingested agent event file {File} for job {JobId}", Path.GetFileName(resolvedPath), jobId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to ingest event file {File}", filePath);
            // Remove from processed set so it can be retried
            if (_processed.TryGetValue(jobId, out var set))
                set.Remove(filePath);
        }
    }
}
