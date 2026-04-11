namespace OpenAgents.OrchestratorApi.Options;

/// <summary>Strongly-typed configuration for the orchestrator API.</summary>
public sealed class OrchestratorOptions
{
    public const string SectionName = "OpenAgents";

    public DockerOptions Docker { get; init; } = new();
    public StorageOptions Storage { get; init; } = new();
    public PathsOptions Paths { get; init; } = new();
    public ApiOptions Api { get; init; } = new();
    public bool UseLocalSimRuntime { get; init; } = false;
}

public sealed class DockerOptions
{
    /// <summary>Path to the Docker socket (used for DinD / socket mount scenarios).</summary>
    public string SocketPath { get; init; } = "/var/run/docker.sock";

    /// <summary>Docker network to attach agent containers to.</summary>
    public string DefaultNetworkName { get; init; } = "openagents-net";
}

public sealed class StorageOptions
{
    /// <summary>
    /// Base directory under which per-job workspaces are created.
    /// Each job gets a subdirectory: {WorkspaceBasePath}/{jobId}/
    /// </summary>
    public string WorkspaceBasePath { get; init; } = "/workspaces";

    public string ArtifactsBasePath { get; init; } = "/artifacts";
}

public sealed class PathsOptions
{
    /// <summary>Path to the workflows directory (relative to content root or absolute).</summary>
    public string WorkflowsDir { get; init; } = "../../workflows";

    /// <summary>Path to the providers directory (relative to content root or absolute).</summary>
    public string ProvidersDir { get; init; } = "../../providers";
}

public sealed class ApiOptions
{
    public string[] CorsOrigins { get; init; } = ["http://localhost:3000", "http://localhost:3001"];
}
