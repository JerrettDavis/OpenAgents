using System.Text.Json;
using Microsoft.Extensions.Options;
using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Options;

namespace OpenAgents.OrchestratorApi.Infrastructure.AgentContainers;

/// <summary>Fetches AgentContainers image-catalog.json from a remote URL.</summary>
public sealed class RemoteAgentContainersCatalog : IProviderManifestCatalog
{
    private readonly Lazy<IReadOnlyList<ProviderManifest>> _manifests;

    public RemoteAgentContainersCatalog(
        IHttpClientFactory httpClientFactory,
        IOptions<OrchestratorOptions> options)
    {
        var acOptions = options.Value.AgentContainers;
        _manifests = new(() => FetchManifests(httpClientFactory, acOptions));
    }

    public IReadOnlyList<ProviderManifest> GetAll() => _manifests.Value;

    public ProviderManifest? GetById(string providerId)
        => GetAll().FirstOrDefault(m => string.Equals(m.Id, providerId, StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyList<ProviderManifest> FetchManifests(
        IHttpClientFactory httpClientFactory,
        AgentContainersOptions options)
    {
        try
        {
            var client = httpClientFactory.CreateClient("AgentContainers");
            client.Timeout = TimeSpan.FromSeconds(30);

            var response = client.GetAsync(options.CatalogUrl).GetAwaiter().GetResult();
            response.EnsureSuccessStatusCode();

            var json = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
            var catalog = JsonSerializer.Deserialize<ImageCatalogJson>(json)
                ?? throw new InvalidOperationException("Failed to deserialize remote image-catalog.json.");

            var envLoader = new NullEnvMetadataLoader();

            return catalog.Images
                .Where(img => img.Type == "tag-policy-image" && img.Tags.Count > 0)
                .Select(img => ToProviderManifest(img, options.ProviderIdPrefix, envLoader))
                .ToList();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            // Log warning but don't crash startup — return empty list
            Console.Error.WriteLine($"[AgentContainers] Failed to fetch remote catalog: {ex.Message}");
            return [];
        }
    }

    private static ProviderManifest ToProviderManifest(
        CatalogImageJson image,
        string prefix,
        IAgentContainersEnvMetadataLoader envLoader)
    {
        var id = $"{prefix}{image.Id}";
        var imageRef = ResolveImageRefOverride(id, image.Tags[0]);

        var allRequired = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var allPassthrough = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var agentId in image.Agents)
        {
            var (required, passthrough) = envLoader.GetEnvVarsForAgent(agentId);
            foreach (var r in required) allRequired.Add(r);
            foreach (var p in passthrough) allPassthrough.Add(p);
        }

        foreach (var r in allRequired) allPassthrough.Add(r);

        var parts = new List<string>();
        if (image.Agents.Count > 0) parts.Add($"Agents: {string.Join(", ", image.Agents)}");
        if (image.ToolPacks.Count > 0) parts.Add($"Tools: {string.Join(", ", image.ToolPacks)}");
        if (!string.IsNullOrEmpty(image.Runtime)) parts.Add($"Runtime: {image.Runtime}");

        return new ProviderManifest(
            Id: id,
            Name: image.DisplayName,
            Version: image.ReleaseVersion ?? "0.0.0",
            ImageRef: imageRef,
            Description: string.Join(" | ", parts),
            SupportLevel: ProviderSupportLevel.Experimental,
            RequiredEnv: allRequired.OrderBy(s => s).ToList(),
            RequiredAnyEnv: [],
            PassthroughEnv: allPassthrough.OrderBy(s => s).ToList());
    }

    private static string ResolveImageRefOverride(string providerId, string imageRef)
    {
        var envVarName = $"{providerId.Replace('-', '_').ToUpperInvariant()}_IMAGE_REF";
        var overrideValue = Environment.GetEnvironmentVariable(envVarName);
        return string.IsNullOrWhiteSpace(overrideValue) ? imageRef : overrideValue.Trim();
    }
}
