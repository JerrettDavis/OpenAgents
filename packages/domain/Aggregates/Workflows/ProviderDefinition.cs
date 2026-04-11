using OpenAgents.Domain.Enums;
using OpenAgents.Domain.Primitives;

namespace OpenAgents.Domain.Aggregates.Workflows;

/// <summary>Strongly-typed identifier for a ProviderDefinition.</summary>
public record ProviderDefinitionId(Guid Value)
{
    public static ProviderDefinitionId New() => new(Guid.NewGuid());
    public static ProviderDefinitionId From(Guid value) => new(value);
    public override string ToString() => Value.ToString();
}

/// <summary>
/// Represents a registered agent provider (e.g. Claude Code).
/// In v1, only claude-code is supported. Provider definitions are seeded
/// at startup and used to validate job creation requests and supply the
/// Docker image reference for container launches.
/// </summary>
public class ProviderDefinition : AggregateRoot<ProviderDefinitionId>
{
    // ──────────────────────────────────────────────────────────
    // Factory
    // ──────────────────────────────────────────────────────────

    public static ProviderDefinition Create(
        string providerId,
        string name,
        string version,
        string dockerImage,
        string? description = null,
        ProviderSupportLevel supportLevel = ProviderSupportLevel.FirstClass,
        bool isEnabled = true)
    {
        return new ProviderDefinition(ProviderDefinitionId.New())
        {
            ProviderId = providerId,
            Name = name,
            Version = version,
            DockerImage = dockerImage,
            Description = description,
            SupportLevel = supportLevel,
            IsEnabled = isEnabled,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    private ProviderDefinition(ProviderDefinitionId id) : base(id) { }
    private ProviderDefinition() { }

    // ──────────────────────────────────────────────────────────
    // Properties
    // ──────────────────────────────────────────────────────────

    /// <summary>Stable string slug (e.g. "claude-code"). Used in API requests.</summary>
    public string ProviderId { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;
    public string Version { get; private set; } = string.Empty;

    /// <summary>Docker image reference (e.g. "openagents/claude-code:latest").</summary>
    public string DockerImage { get; private set; } = string.Empty;

    public string? Description { get; private set; }
    public ProviderSupportLevel SupportLevel { get; private set; }
    public bool IsEnabled { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    // ──────────────────────────────────────────────────────────
    // Well-known provider ID constants
    // ──────────────────────────────────────────────────────────

    public static class KnownIds
    {
        public const string ClaudeCode = "claude-code";
    }

    public void UpdateMetadata(
        string name,
        string version,
        string dockerImage,
        string? description,
        ProviderSupportLevel supportLevel)
    {
        Name = name;
        Version = version;
        DockerImage = dockerImage;
        Description = description;
        SupportLevel = supportLevel;
    }

    public void SetEnabled(bool isEnabled)
    {
        IsEnabled = isEnabled;
    }
}
