using OpenAgents.Domain.Primitives;

namespace OpenAgents.Domain.Aggregates.Workspaces;

/// <summary>
/// Strongly-typed workspace identifier.
/// </summary>
public record WorkspaceId(Guid Value)
{
    public static WorkspaceId New() => new(Guid.NewGuid());
    public static WorkspaceId From(Guid value) => new(value);
    public override string ToString() => Value.ToString();
}

/// <summary>
/// Workspace represents the durable filesystem context for a job.
/// It maps to the /workspace/&lt;project&gt; directory structure defined in
/// the Workspace Contract spec.
///
/// Workspace validation, git tracking, and TODO.md parsing are
/// implemented incrementally by milestone.
/// </summary>
public class Workspace : AggregateRoot<WorkspaceId>
{
    public static Workspace Create(
        string projectName,
        string hostPath)
    {
        return new Workspace(WorkspaceId.New())
        {
            ProjectName = projectName,
            HostPath = hostPath,
            ContainerPath = $"/workspace/{projectName}",
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    private Workspace(WorkspaceId id) : base(id) { }
    private Workspace() { }

    public string ProjectName { get; private set; } = string.Empty;

    /// <summary>Host filesystem path to the workspace root.</summary>
    public string HostPath { get; private set; } = string.Empty;

    /// <summary>Container mount path (always /workspace/&lt;project&gt;).</summary>
    public string ContainerPath { get; private set; } = string.Empty;

    public DateTime CreatedAtUtc { get; private set; }
}
