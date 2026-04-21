using System.Text.Json.Serialization;

namespace OpenAgents.OrchestratorApi.Infrastructure.AgentContainers;

/// <summary>Root object of the AgentContainers image-catalog.json file.</summary>
internal sealed class ImageCatalogJson
{
    [JsonPropertyName("manifest_hash")]
    public string ManifestHash { get; init; } = "";

    [JsonPropertyName("generator_version")]
    public string GeneratorVersion { get; init; } = "";

    [JsonPropertyName("registry")]
    public string Registry { get; init; } = "";

    [JsonPropertyName("images")]
    public List<CatalogImageJson> Images { get; init; } = [];
}

/// <summary>A single image entry in the catalog.</summary>
internal sealed class CatalogImageJson
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = "";

    [JsonPropertyName("id")]
    public string Id { get; init; } = "";

    [JsonPropertyName("display_name")]
    public string DisplayName { get; init; } = "";

    [JsonPropertyName("runtime")]
    public string? Runtime { get; init; }

    [JsonPropertyName("release_version")]
    public string? ReleaseVersion { get; init; }

    [JsonPropertyName("agents")]
    public List<string> Agents { get; init; } = [];

    [JsonPropertyName("tool_packs")]
    public List<string> ToolPacks { get; init; } = [];

    [JsonPropertyName("platforms")]
    public List<string> Platforms { get; init; } = [];

    [JsonPropertyName("tags")]
    public List<string> Tags { get; init; } = [];

    [JsonPropertyName("family")]
    public string? Family { get; init; }

    [JsonPropertyName("from_image")]
    public string? FromImage { get; init; }

    [JsonPropertyName("provides")]
    public List<string> Provides { get; init; } = [];

    [JsonPropertyName("registry")]
    public string? ImageRegistry { get; init; }

    [JsonPropertyName("requires")]
    public List<string> Requires { get; init; } = [];

    [JsonPropertyName("install_method")]
    public string? InstallMethod { get; init; }

    [JsonPropertyName("bases")]
    public List<string> Bases { get; init; } = [];

    [JsonPropertyName("tool_pack")]
    public string? ToolPack { get; init; }

    [JsonPropertyName("base_id")]
    public string? BaseId { get; init; }
}
