using OpenAgents.Domain.Primitives;

namespace OpenAgents.Domain.Aggregates.Jobs;

/// <summary>Strongly-typed identifier for a JobEvent.</summary>
public record JobEventId(Guid Value)
{
    public static JobEventId New() => new(Guid.NewGuid());
    public static JobEventId From(Guid value) => new(value);
    public override string ToString() => Value.ToString();
}

/// <summary>
/// Represents a single entry in the append-only job event log.
///
/// v1 implementation note: events are either emitted by the orchestrator
/// directly (e.g. job.created, job.started) or ingested from agent-written
/// JSON files in .agent-orch/events/. Both paths write to this table and
/// broadcast via SSE.
/// </summary>
public class JobEvent : Entity<JobEventId>
{
    // ──────────────────────────────────────────────────────────
    // Factory
    // ──────────────────────────────────────────────────────────

    public static JobEvent Create(
        Guid jobId,
        string eventType,
        string summary,
        string source = "orchestrator",
        string? payloadJson = null)
    {
        return new JobEvent(JobEventId.New())
        {
            JobId = jobId,
            EventType = eventType,
            Summary = summary,
            Source = source,
            PayloadJson = payloadJson,
            OccurredAtUtc = DateTime.UtcNow,
            RecordedAtUtc = DateTime.UtcNow
        };
    }

    private JobEvent(JobEventId id) : base(id) { }
    private JobEvent() { }

    // ──────────────────────────────────────────────────────────
    // Properties
    // ──────────────────────────────────────────────────────────

    /// <summary>Foreign key to the owning job.</summary>
    public Guid JobId { get; private set; }

    /// <summary>
    /// Dot-namespaced event type (e.g. "job.created", "job.started",
    /// "job.log", "agent.event").
    /// </summary>
    public string EventType { get; private set; } = string.Empty;

    /// <summary>Human-readable one-line description of the event.</summary>
    public string Summary { get; private set; } = string.Empty;

    /// <summary>"orchestrator" or "agent".</summary>
    public string Source { get; private set; } = "orchestrator";

    /// <summary>Optional JSON payload for provider-specific data.</summary>
    public string? PayloadJson { get; private set; }

    /// <summary>When the event actually occurred.</summary>
    public DateTime OccurredAtUtc { get; private set; }

    /// <summary>When the orchestrator recorded the event in storage.</summary>
    public DateTime RecordedAtUtc { get; private set; }

    // ──────────────────────────────────────────────────────────
    // Well-known event type constants
    // ──────────────────────────────────────────────────────────

    public static class Types
    {
        public const string JobCreated = "job.created";
        public const string JobQueued = "job.queued";
        public const string JobProvisioning = "job.provisioning";
        public const string JobStarted = "job.started";
        public const string JobCompleted = "job.completed";
        public const string JobFailed = "job.failed";
        public const string JobArchived = "job.archived";
        public const string JobLog = "job.log";
        public const string AgentLog = "agent.log";
        public const string AgentEvent = "agent.event";
    }
}
