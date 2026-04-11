using OpenAgents.Domain.Primitives;

namespace OpenAgents.Domain.Aggregates.Workflows;

/// <summary>
/// Strongly-typed identifier for a WorkflowDefinition.
/// </summary>
public record WorkflowDefinitionId(Guid Value)
{
    public static WorkflowDefinitionId New() => new(Guid.NewGuid());
    public static WorkflowDefinitionId From(Guid value) => new(value);
    public override string ToString() => Value.ToString();
}

/// <summary>
/// Represents a versioned, reusable workflow template.
/// The workflow engine wiring continues to expand by milestone.
///
/// A WorkflowDefinition is design-time metadata, NOT runtime execution state.
/// Runtime execution state lives in Job and its child entities.
/// </summary>
public class WorkflowDefinition : AggregateRoot<WorkflowDefinitionId>
{
    public static WorkflowDefinition Create(
        string name,
        string slug,
        string version,
        string? description = null,
        string? category = null,
        bool isExperimental = false,
        bool isEnabled = true)
    {
        return new WorkflowDefinition(WorkflowDefinitionId.New())
        {
            Name = name,
            Slug = slug,
            Version = version,
            Description = description,
            Category = category,
            IsExperimental = isExperimental,
            IsEnabled = isEnabled,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    private WorkflowDefinition(WorkflowDefinitionId id) : base(id) { }
    private WorkflowDefinition() { }

    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string Version { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string? Category { get; private set; }
    public bool IsEnabled { get; private set; }
    public bool IsExperimental { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    // Stage definitions, compatibility matrix, and policies will be
    // modelled as child value objects in Milestone 3.

    public void UpdateMetadata(
        string name,
        string version,
        string? description,
        string? category,
        bool isExperimental)
    {
        Name = name;
        Version = version;
        Description = description;
        Category = category;
        IsExperimental = isExperimental;
    }

    public void SetEnabled(bool isEnabled)
    {
        IsEnabled = isEnabled;
    }
}
