namespace OpenAgents.Domain.Contracts;

/// <summary>
/// Abstraction over the Docker / container runtime. Implemented by
/// the infrastructure layer so the domain stays container-agnostic.
/// </summary>
public interface IContainerRuntime
{
    /// <summary>Start a container for a given job execution context.</summary>
    Task<string> StartContainerAsync(
        ContainerStartRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>Stop a running container by its container ID.</summary>
    Task StopContainerAsync(
        string containerId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Block until the container exits and return its exit code.
    /// </summary>
    Task<int> WaitForContainerAsync(
        string containerId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Stream log lines from a running container.
    /// The returned <see cref="IAsyncEnumerable{T}"/> yields raw lines.
    /// </summary>
    IAsyncEnumerable<string> StreamLogsAsync(
        string containerId,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Parameters needed to launch an agent container.
/// </summary>
public record ContainerStartRequest(
    string Image,
    string ContainerName,
    string WorkspaceHostPath,
    string WorkspaceContainerPath,
    IReadOnlyDictionary<string, string> EnvironmentVariables);
