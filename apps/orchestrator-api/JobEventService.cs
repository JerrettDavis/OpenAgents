using System.Text.Json;
using OpenAgents.Domain.Aggregates.Jobs;
using OpenAgents.Domain.Contracts;
using OpenAgents.OrchestratorApi.Infrastructure;

namespace OpenAgents.OrchestratorApi.Services;

/// <summary>
/// High-level service that combines event persistence (via <see cref="IJobEventRepository"/>)
/// with real-time SSE broadcast (via <see cref="SseHub"/>).
///
/// All orchestrator-originated events go through <see cref="EmitAsync"/> to ensure
/// the event is both stored in the database and fanned-out to connected UI clients.
/// Agent-originated events (from filesystem watcher) also use this service after
/// being deserialized from .agent-orch/events/ JSON files.
/// </summary>
public sealed class JobEventService
{
    private readonly IJobEventRepository _repository;
    private readonly SseHub _hub;
    private readonly ILogger<JobEventService> _logger;

    public JobEventService(
        IJobEventRepository repository,
        SseHub hub,
        ILogger<JobEventService> logger)
    {
        _repository = repository;
        _hub        = hub;
        _logger     = logger;
    }

    // ──────────────────────────────────────────────────────────
    // Emit
    // ──────────────────────────────────────────────────────────

    /// <summary>
    /// Persist an event to the database and broadcast it to SSE subscribers.
    /// </summary>
    public async Task EmitAsync(
        Guid jobId,
        string eventType,
        string summary,
        string source = "orchestrator",
        object? payload = null,
        CancellationToken ct = default)
    {
        var payloadJson = payload is null
            ? null
            : JsonSerializer.Serialize(payload, _jsonOptions);

        var jobEvent = JobEvent.Create(jobId, eventType, summary, source, payloadJson);

        try
        {
            await _repository.AddAsync(jobEvent, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist event {EventType} for job {JobId}", eventType, jobId);
        }

        // Broadcast regardless of DB failure — real-time > durability for live view
        BroadcastToHub(jobId, jobEvent, payloadJson);
    }

    /// <summary>
    /// Ingest a raw agent event JSON (from .agent-orch/events/ file) into the log.
    /// The file content is stored as-is in PayloadJson.
    /// </summary>
    public async Task IngestAgentEventFileAsync(
        Guid jobId,
        string fileContent,
        CancellationToken ct = default)
    {
        // Extract basic fields from agent event envelope if present
        string eventType = JobEvent.Types.AgentEvent;
        string summary   = "Agent event";
        try
        {
            using var doc = JsonDocument.Parse(fileContent);
            var root = doc.RootElement;
            if (root.TryGetProperty("event_type", out var et)) eventType = et.GetString() ?? eventType;
            if (root.TryGetProperty("summary",    out var sm)) summary   = sm.GetString() ?? summary;
        }
        catch { /* malformed agent JSON — still ingest */ }

        var jobEvent = JobEvent.Create(jobId, eventType, summary, "agent", fileContent);

        try
        {
            await _repository.AddAsync(jobEvent, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist agent event for job {JobId}", jobId);
        }

        BroadcastToHub(jobId, jobEvent, fileContent);
    }

    // ──────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────

    private void BroadcastToHub(Guid jobId, JobEvent jobEvent, string? payloadJson)
    {
        try
        {
            // Use snake_case field names so the frontend can detect events via
            // `"event_id" in sseEvent.data` (see job-detail-view.tsx).
            var ssePayload = JsonSerializer.Serialize(new
            {
                event_id        = jobEvent.Id.Value,
                job_id          = jobId,
                event_type      = jobEvent.EventType,
                summary         = jobEvent.Summary,
                source          = jobEvent.Source,
                occurred_at_utc = jobEvent.OccurredAtUtc,
                payload         = payloadJson is null ? null : JsonSerializer.Deserialize<object?>(payloadJson, _jsonOptions)
            }, _jsonOptions);

            _hub.Broadcast(jobId, ssePayload);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast event {EventType} for job {JobId}", jobEvent.EventType, jobId);
        }
    }

    // snake_case so explicitly-named anonymous-object properties stay as written
    // (CamelCase policy only lowercases the first character — underscores are preserved).
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented        = false
    };
}
