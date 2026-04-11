namespace OpenAgents.Domain.Enums;

/// <summary>
/// Business-level outcome of a completed job. Separate from JobState
/// to allow rich post-mortem classification without conflating runtime
/// lifecycle with success/failure semantics.
/// </summary>
public enum JobOutcome
{
    NotStarted = 0,
    CompletedSuccessfully = 1,
    CompletedAbnormally = 2,
    CompletedWithErrors = 3,
    PartiallyCompleted = 4,
    Incomplete = 5,
    Failed = 6,
    Invalid = 7
}
