using System.Text.Json;
using Microsoft.Extensions.Options;
using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Options;

namespace OpenAgents.OrchestratorApi.Infrastructure.AgentContainers;

/// <summary>Reads AgentContainers image-catalog.json from a local file path.</summary>
public sealed class LocalFileAgentContainersCatalog : IProviderManifestCatalog
{
    private readonly Lazy<IReadOnlyList<ProviderManifest>> _manifests;

    public LocalFileAgentContainersCatalog(
        IOptions<OrchestratorOptions> options,
        IAgentContainersEnvMetadataLoader envLoader)
    {
        var acOptions = options.Value.AgentContainers;
        _manifests = new(() => LoadManifests(acOptions, envLoader));
    }

    public IReadOnlyList<ProviderManifest> GetAll() => _manifests.Value;

    public ProviderManifest? GetById(string providerId)
        => GetAll().FirstOrDefault(m => string.Equals(m.Id, providerId, StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyList<ProviderManifest> LoadManifests(
        AgentContainersOptions options,
        IAgentContainersEnvMetadataLoader envLoader)
    {
        var catalogPath = Path.Combine(options.LocalRepoPath, "generated", "image-catalog.json");
        if (!File.Exists(catalogPath))
            throw new FileNotFoundException(
                $"AgentContainers image-catalog.json not found at: {catalogPath}. Check AgentContainers:LocalRepoPath configuration.");

        var json = File.ReadAllText(catalogPath);
        var catalog = JsonSerializer.Deserialize<ImageCatalogJson>(json)
            ?? throw new InvalidOperationException("Failed to deserialize image-catalog.json.");

        return catalog.Images
            .Where(img => img.Type == "tag-policy-image" && img.Tags.Count > 0)
            .Select(img => ToProviderManifest(img, options.ProviderIdPrefix, envLoader))
            .ToList();
    }

    private static ProviderManifest ToProviderManifest(
        CatalogImageJson image,
        string prefix,
        IAgentContainersEnvMetadataLoader envLoader)
    {
        var id = $"{prefix}{image.Id}";
        var imageRef = ResolveImageRefOverride(id, image.Tags[0]);

        // Aggregate env vars from all agents in this image
        var allRequired = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var allPassthrough = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var agentId in image.Agents)
        {
            var (required, passthrough) = envLoader.GetEnvVarsForAgent(agentId);
            foreach (var r in required) allRequired.Add(r);
            foreach (var p in passthrough) allPassthrough.Add(p);
        }

        // Passthrough should include required
        foreach (var r in allRequired) allPassthrough.Add(r);

        var description = BuildDescription(image);

        return new ProviderManifest(
            Id: id,
            Name: image.DisplayName,
            Version: image.ReleaseVersion ?? "0.0.0",
            ImageRef: imageRef,
            Description: description,
            SupportLevel: ProviderSupportLevel.Experimental,
            RequiredEnv: allRequired.OrderBy(s => s).ToList(),
            RequiredAnyEnv: [],
            PassthroughEnv: allPassthrough.OrderBy(s => s).ToList());
    }

    private static string BuildDescription(CatalogImageJson image)
    {
        var parts = new List<string>();
        if (image.Agents.Count > 0)
            parts.Add($"Agents: {string.Join(", ", image.Agents)}");
        if (image.ToolPacks.Count > 0)
            parts.Add($"Tools: {string.Join(", ", image.ToolPacks)}");
        if (!string.IsNullOrEmpty(image.Runtime))
            parts.Add($"Runtime: {image.Runtime}");
        return string.Join(" | ", parts);
    }

    private static string ResolveImageRefOverride(string providerId, string imageRef)
    {
        var envVarName = $"{providerId.Replace('-', '_').ToUpperInvariant()}_IMAGE_REF";
        var overrideValue = Environment.GetEnvironmentVariable(envVarName);
        return string.IsNullOrWhiteSpace(overrideValue) ? imageRef : overrideValue.Trim();
    }
}
