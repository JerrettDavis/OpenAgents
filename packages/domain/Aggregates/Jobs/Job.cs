using OpenAgents.Domain.Enums;
using OpenAgents.Domain.Primitives;

namespace OpenAgents.Domain.Aggregates.Jobs;

/// <summary>
/// Strongly-typed identifier for a Job aggregate.
/// </summary>
public record JobId(Guid Value)
{
    public static JobId New() => new(Guid.NewGuid());
    public static JobId From(Guid value) => new(value);
    public override string ToString() => Value.ToString();
}

/// <summary>
/// Job is the primary aggregate in OpenAgents. It represents one orchestrated
/// execution request — binding a workflow, provider, workspace, and set of
/// agents into a single unit of work.
///
/// Business logic lives here and evolves by milestone.
/// Stage/task/agent child entities continue expanding over time.
/// </summary>
public class Job : AggregateRoot<JobId>
{
    // ──────────────────────────────────────────────────────────
    // Factory
    // ──────────────────────────────────────────────────────────

    public static Job Create(
        string title,
        string? description,
        Guid workflowDefinitionId,
        string workflowSlug,
        string workflowVersion,
        string primaryProviderId,
        string? primaryModel = null)
    {
        var job = new Job(JobId.New())
        {
            Title = title,
            Description = description,
            WorkflowDefinitionId = workflowDefinitionId,
            WorkflowSlug = workflowSlug,
            WorkflowVersion = workflowVersion,
            PrimaryProviderId = primaryProviderId,
            PrimaryModel = primaryModel,
            State = JobState.Pending,
            Outcome = JobOutcome.NotStarted,
            ConnectionStatus = ConnectionStatus.Unknown,
            CreatedAtUtc = DateTime.UtcNow
        };

        return job;
    }

    // ──────────────────────────────────────────────────────────
    // Constructor (EF Core / deserializer)
    // ──────────────────────────────────────────────────────────

    private Job(JobId id) : base(id) { }
    private Job() { }

    // ──────────────────────────────────────────────────────────
    // Identity & metadata
    // ──────────────────────────────────────────────────────────

    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }

    // ──────────────────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────────────────

    public JobState State { get; private set; }
    public JobOutcome Outcome { get; private set; }
    public ConnectionStatus ConnectionStatus { get; private set; }

    // ──────────────────────────────────────────────────────────
    // Timestamps
    // ──────────────────────────────────────────────────────────

    public DateTime CreatedAtUtc { get; private set; }
    public DateTime? QueuedAtUtc { get; private set; }
    public DateTime? ProvisionedAtUtc { get; private set; }
    public DateTime? StartedAtUtc { get; private set; }
    public DateTime? FinishedAtUtc { get; private set; }
    public DateTime? ArchivedAtUtc { get; private set; }

    public TimeSpan? Duration => FinishedAtUtc.HasValue && StartedAtUtc.HasValue
        ? FinishedAtUtc - StartedAtUtc
        : null;

    // ──────────────────────────────────────────────────────────
    // Execution context
    // ──────────────────────────────────────────────────────────

    public Guid WorkflowDefinitionId { get; private set; }
    public string WorkflowSlug { get; private set; } = string.Empty;
    public string WorkflowVersion { get; private set; } = string.Empty;
    public string? WorkflowCategory { get; private set; }
    public string PrimaryProviderId { get; private set; } = string.Empty;
    public string? PrimaryModel { get; private set; }

    public string? SourceGitBranch { get; private set; }
    public string? WorkingGitBranch { get; private set; }
    public string? TargetGitBranch { get; private set; }

    // ──────────────────────────────────────────────────────────
    // Workspace & runtime context
    // ──────────────────────────────────────────────────────────

    /// <summary>Host-side absolute path to the workspace root directory.</summary>
    public string? WorkspaceHostPath { get; private set; }

    /// <summary>Unique ID for the active workspace (mirrors /workspace/&lt;project&gt; mapping).</summary>
    public Guid? ActiveWorkspaceId { get; private set; }

    /// <summary>Docker container ID for the currently running agent container.</summary>
    public string? ContainerId { get; private set; }

    /// <summary>Human-readable error message if the job failed.</summary>
    public string? ErrorMessage { get; private set; }

    // ──────────────────────────────────────────────────────────
    // Behaviour stubs (business logic to be filled in Milestone 1+)
    // ──────────────────────────────────────────────────────────

    public void Queue()
    {
        GuardTransition(JobState.Pending, JobState.Queued);
        State = JobState.Queued;
        QueuedAtUtc = DateTime.UtcNow;
    }

    /// <summary>Transition to Provisioning, recording workspace location.</summary>
    public void Provision(Guid workspaceId, string workspaceHostPath)
    {
        GuardTransition(JobState.Queued, JobState.Provisioning);
        State = JobState.Provisioning;
        ActiveWorkspaceId = workspaceId;
        WorkspaceHostPath = workspaceHostPath;
        ProvisionedAtUtc = DateTime.UtcNow;
    }

    /// <summary>Transition to Running, recording the launched container ID.</summary>
    public void Start(string containerId)
    {
        GuardTransition(JobState.Provisioning, JobState.Running);
        State = JobState.Running;
        ContainerId = containerId;
        ConnectionStatus = ConnectionStatus.Connected;
        StartedAtUtc = DateTime.UtcNow;
    }

    public void Complete(JobOutcome outcome)
    {
        State = JobState.Completed;
        Outcome = outcome;
        ConnectionStatus = ConnectionStatus.Disconnected;
        FinishedAtUtc = DateTime.UtcNow;
    }

    public void Fail(string? reason = null)
    {
        State = JobState.Error;
        Outcome = JobOutcome.Failed;
        ErrorMessage = reason;
        ConnectionStatus = ConnectionStatus.Failed;
        FinishedAtUtc = DateTime.UtcNow;
    }

    public void Archive()
    {
        State = JobState.Archived;
        ArchivedAtUtc = DateTime.UtcNow;
    }

    // ──────────────────────────────────────────────────────────
    // Guards
    // ──────────────────────────────────────────────────────────

    private void GuardTransition(JobState expected, JobState next)
    {
        if (State != expected)
            throw new InvalidOperationException(
                $"Cannot transition job {Id} from {State} to {next}; expected state {expected}.");
    }
}
