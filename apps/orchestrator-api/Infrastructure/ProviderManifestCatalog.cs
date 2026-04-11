using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Options;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace OpenAgents.OrchestratorApi.Infrastructure;

public sealed record ProviderManifest(
    string Id,
    string Name,
    string Version,
    string ImageRef,
    string? Description,
    ProviderSupportLevel SupportLevel,
    IReadOnlyList<string> RequiredEnv,
    IReadOnlyList<string> RequiredAnyEnv,
    IReadOnlyList<string> PassthroughEnv);

public interface IProviderManifestCatalog
{
    IReadOnlyList<ProviderManifest> GetAll();
    ProviderManifest? GetById(string providerId);
}

public sealed class FileSystemProviderManifestCatalog : IProviderManifestCatalog
{
    private readonly Lazy<IReadOnlyList<ProviderManifest>> _manifests;

    public FileSystemProviderManifestCatalog(
        IHostEnvironment environment,
        IOptions<OrchestratorOptions> options)
    {
        _manifests = new(() => LoadManifests(environment.ContentRootPath, options.Value.Paths.ProvidersDir));
    }

    public IReadOnlyList<ProviderManifest> GetAll() => _manifests.Value;

    public ProviderManifest? GetById(string providerId)
        => GetAll().FirstOrDefault(m => string.Equals(m.Id, providerId, StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyList<ProviderManifest> LoadManifests(string contentRootPath, string providersDir)
    {
        var resolvedProvidersDir = ResolvePath(contentRootPath, providersDir);
        if (!Directory.Exists(resolvedProvidersDir))
            throw new DirectoryNotFoundException($"Providers directory not found: {resolvedProvidersDir}");

        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();

        return Directory.EnumerateFiles(resolvedProvidersDir, "provider.yaml", SearchOption.AllDirectories)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .Select(path => deserializer.Deserialize<ProviderManifestFile>(File.ReadAllText(path)))
            .Select(ToManifest)
            .ToList();
    }

    private static ProviderManifest ToManifest(ProviderManifestFile file)
    {
        var provider = file.Provider ?? throw new InvalidOperationException("provider.yaml missing 'provider' root object.");
        var id = Require(provider.Id, "provider.id");
        var imageRef = ResolveImageRefOverride(id, Require(provider.Image?.Ref, "provider.image.ref"));
        var supportLevel = ParseSupportLevel(provider.SupportLevel);
        var requiredEnv = provider.Auth?.RequiredEnv?
            .Where(static value => !string.IsNullOrWhiteSpace(value))
            .Select(static value => value.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray() ?? [];
        var requiredAnyEnv = provider.Auth?.RequiredAnyEnv?
            .Where(static value => !string.IsNullOrWhiteSpace(value))
            .Select(static value => value.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray() ?? [];

        var passthroughEnv = provider.Auth?.PassthroughEnv
            ?.Concat(requiredEnv)
            .Concat(requiredAnyEnv)
            .Where(static value => !string.IsNullOrWhiteSpace(value))
            .Select(static value => value.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray() ?? [];

        return new ProviderManifest(
            Id: id,
            Name: Require(provider.Name, "provider.name"),
            Version: Require(provider.Version, "provider.version"),
            ImageRef: imageRef,
            Description: provider.Description?.Trim(),
            SupportLevel: supportLevel,
            RequiredEnv: requiredEnv,
            RequiredAnyEnv: requiredAnyEnv,
            PassthroughEnv: passthroughEnv);
    }

    private static string ResolveImageRefOverride(string providerId, string imageRef)
    {
        var envVarName = $"{providerId.Replace('-', '_').ToUpperInvariant()}_IMAGE_REF";
        var overrideValue = Environment.GetEnvironmentVariable(envVarName);
        return string.IsNullOrWhiteSpace(overrideValue) ? imageRef : overrideValue.Trim();
    }

    private static ProviderSupportLevel ParseSupportLevel(string? supportLevel)
    {
        var normalised = supportLevel?
            .Replace("-", string.Empty, StringComparison.Ordinal)
            .Replace("_", string.Empty, StringComparison.Ordinal);

        return Enum.TryParse<ProviderSupportLevel>(normalised, true, out var parsed)
            ? parsed
            : ProviderSupportLevel.FirstClass;
    }

    private static string Require(string? value, string fieldName)
        => string.IsNullOrWhiteSpace(value)
            ? throw new InvalidOperationException($"provider.yaml missing required field '{fieldName}'.")
            : value.Trim();

    private static string ResolvePath(string contentRootPath, string configuredPath)
        => Path.IsPathRooted(configuredPath)
            ? configuredPath
            : Path.GetFullPath(Path.Combine(contentRootPath, configuredPath));

    private sealed class ProviderManifestFile
    {
        public ProviderFile? Provider { get; init; }
    }

    private sealed class ProviderFile
    {
        public string? Id { get; init; }
        public string? Name { get; init; }
        public string? Version { get; init; }
        public string? Description { get; init; }
        public string? SupportLevel { get; init; }
        public ProviderImageFile? Image { get; init; }
        public ProviderAuthFile? Auth { get; init; }
    }

    private sealed class ProviderImageFile
    {
        public string? Ref { get; init; }
    }

    private sealed class ProviderAuthFile
    {
        public string[]? RequiredEnv { get; init; }
        public string[]? RequiredAnyEnv { get; init; }
        public string[]? PassthroughEnv { get; init; }
    }
}
