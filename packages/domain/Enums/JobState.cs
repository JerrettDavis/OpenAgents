namespace OpenAgents.Domain.Enums;

/// <summary>
/// Runtime execution state of a Job. Reflects container lifecycle and
/// orchestrator tracking status. Deliberately separate from Outcome.
/// </summary>
public enum JobState
{
    Pending = 0,
    Queued = 1,
    Provisioning = 2,
    Connecting = 3,
    Running = 4,
    Paused = 5,
    Stopping = 6,
    Completed = 7,
    Error = 8,
    Archived = 9
}
