using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Options;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace OpenAgents.OrchestratorApi.Infrastructure;

public sealed record WorkflowManifestCompatibility(string ProviderId, ProviderSupportLevel SupportLevel);

public sealed record WorkflowManifest(
    string Slug,
    string Name,
    string Version,
    string? Description,
    string Category,
    IReadOnlyList<WorkflowManifestCompatibility> ProviderCompatibility);

public interface IWorkflowManifestCatalog
{
    IReadOnlyList<WorkflowManifest> GetAll();
    WorkflowManifest? GetBySlug(string slug);
}

public sealed class FileSystemWorkflowManifestCatalog : IWorkflowManifestCatalog
{
    private readonly Lazy<IReadOnlyList<WorkflowManifest>> _manifests;

    public FileSystemWorkflowManifestCatalog(
        IHostEnvironment environment,
        IOptions<OrchestratorOptions> options)
    {
        _manifests = new(() => LoadManifests(environment.ContentRootPath, options.Value.Paths.WorkflowsDir));
    }

    public IReadOnlyList<WorkflowManifest> GetAll() => _manifests.Value;

    public WorkflowManifest? GetBySlug(string slug)
        => GetAll().FirstOrDefault(m => string.Equals(m.Slug, slug, StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyList<WorkflowManifest> LoadManifests(string contentRootPath, string workflowsDir)
    {
        var resolvedWorkflowsDir = ResolvePath(contentRootPath, workflowsDir);
        if (!Directory.Exists(resolvedWorkflowsDir))
            throw new DirectoryNotFoundException($"Workflows directory not found: {resolvedWorkflowsDir}");

        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();

        return Directory.EnumerateFiles(resolvedWorkflowsDir, "workflow.yaml", SearchOption.AllDirectories)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .Select(path => deserializer.Deserialize<WorkflowManifestFile>(File.ReadAllText(path)))
            .Select(ToManifest)
            .ToList();
    }

    private static WorkflowManifest ToManifest(WorkflowManifestFile file)
    {
        var workflow = file.Workflow ?? throw new InvalidOperationException("workflow.yaml missing 'workflow' root object.");
        var compatibility = workflow.Compatibility?.Providers?.Select(provider => new WorkflowManifestCompatibility(
            ProviderId: Require(provider.Id, "workflow.compatibility.providers.id"),
            SupportLevel: ParseSupportLevel(provider.Support)))
            .ToArray() ?? [];

        return new WorkflowManifest(
            Slug: Require(workflow.Id, "workflow.id"),
            Name: Require(workflow.Name, "workflow.name"),
            Version: Require(workflow.Version, "workflow.version"),
            Description: workflow.Description?.Trim(),
            Category: string.IsNullOrWhiteSpace(workflow.Category) ? "general" : workflow.Category.Trim(),
            ProviderCompatibility: compatibility);
    }

    private static ProviderSupportLevel ParseSupportLevel(string? supportLevel)
    {
        var normalised = supportLevel?
            .Replace("-", string.Empty, StringComparison.Ordinal)
            .Replace("_", string.Empty, StringComparison.Ordinal);

        return Enum.TryParse<ProviderSupportLevel>(normalised, true, out var parsed)
            ? parsed
            : ProviderSupportLevel.Supported;
    }

    private static string Require(string? value, string fieldName)
        => string.IsNullOrWhiteSpace(value)
            ? throw new InvalidOperationException($"workflow.yaml missing required field '{fieldName}'.")
            : value.Trim();

    private static string ResolvePath(string contentRootPath, string configuredPath)
        => Path.IsPathRooted(configuredPath)
            ? configuredPath
            : Path.GetFullPath(Path.Combine(contentRootPath, configuredPath));

    private sealed class WorkflowManifestFile
    {
        public WorkflowFile? Workflow { get; init; }
    }

    private sealed class WorkflowFile
    {
        public string? Id { get; init; }
        public string? Name { get; init; }
        public string? Version { get; init; }
        public string? Description { get; init; }
        public string? Category { get; init; }
        public WorkflowCompatibilityFile? Compatibility { get; init; }
    }

    private sealed class WorkflowCompatibilityFile
    {
        public WorkflowProviderFile[]? Providers { get; init; }
    }

    private sealed class WorkflowProviderFile
    {
        public string? Id { get; init; }
        public string? Support { get; init; }
    }
}
