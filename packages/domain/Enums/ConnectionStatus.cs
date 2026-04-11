namespace OpenAgents.Domain.Enums;

/// <summary>
/// Transport/connection status between the orchestrator and an agent container.
/// Separate from JobState to allow precise degraded-state tracking.
/// </summary>
public enum ConnectionStatus
{
    Unknown = 0,
    Connecting = 1,
    Connected = 2,
    Flakey = 3,
    Failing = 4,
    Failed = 5,
    Disconnected = 6
}
