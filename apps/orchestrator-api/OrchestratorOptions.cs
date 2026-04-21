namespace OpenAgents.OrchestratorApi.Options;

/// <summary>Strongly-typed configuration for the orchestrator API.</summary>
public sealed class OrchestratorOptions
{
    public const string SectionName = "OpenAgents";

    public DockerOptions Docker { get; init; } = new();
    public StorageOptions Storage { get; init; } = new();
    public PathsOptions Paths { get; init; } = new();
    public ApiOptions Api { get; init; } = new();
    public AgentContainersOptions AgentContainers { get; init; } = new();
    public bool UseLocalSimRuntime { get; init; } = false;
}

public sealed class DockerOptions
{
    /// <summary>Path to the Docker socket (used for DinD / socket mount scenarios).</summary>
    public string SocketPath { get; init; } = "/var/run/docker.sock";

    /// <summary>Docker network to attach agent containers to.</summary>
    public string DefaultNetworkName { get; init; } = "openagents-net";

    /// <summary>
    /// Optional named volume shared between the orchestrator API container and spawned
    /// provider containers. When set, provider containers mount this volume instead of
    /// bind-mounting <see cref="StorageOptions.WorkspaceBasePath"/> from the API container.
    /// </summary>
    public string? SharedWorkspaceVolumeName { get; init; }
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

public sealed class AgentContainersOptions
{
    /// <summary>Enables AgentContainers as an additional provider source.</summary>
    public bool Enabled { get; init; } = false;

    /// <summary>"local" reads image-catalog.json from LocalRepoPath. "remote" fetches from CatalogUrl via HTTP.</summary>
    public string Mode { get; init; } = "local";

    /// <summary>Absolute path to the AgentContainers repo root. Used when Mode=local.</summary>
    public string LocalRepoPath { get; init; } = string.Empty;

    /// <summary>URL to the raw image-catalog.json. Used when Mode=remote.</summary>
    public string CatalogUrl { get; init; } =
        "https://raw.githubusercontent.com/JerrettDavis/AgentContainers/main/generated/image-catalog.json";

    /// <summary>When Mode=local, also read definitions/ YAML to extract env var requirements.</summary>
    public bool LoadEnvMetadataFromDefinitions { get; init; } = true;

    /// <summary>Prefix added to provider IDs from AgentContainers to avoid collision.</summary>
    public string ProviderIdPrefix { get; init; } = "ac-";
}
