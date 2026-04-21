namespace OpenAgents.OrchestratorApi.Infrastructure.AgentContainers;

/// <summary>Provides environment variable metadata for AgentContainers agents.</summary>
public interface IAgentContainersEnvMetadataLoader
{
    /// <summary>Returns required and passthrough env var names for a given agent ID.</summary>
    (IReadOnlyList<string> Required, IReadOnlyList<string> Passthrough) GetEnvVarsForAgent(string agentId);
}

/// <summary>Returns empty env var lists. Used when YAML definitions are not available.</summary>
public sealed class NullEnvMetadataLoader : IAgentContainersEnvMetadataLoader
{
    public (IReadOnlyList<string> Required, IReadOnlyList<string> Passthrough) GetEnvVarsForAgent(string agentId)
        => ([], []);
}
