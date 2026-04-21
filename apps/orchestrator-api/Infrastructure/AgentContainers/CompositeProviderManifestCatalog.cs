namespace OpenAgents.OrchestratorApi.Infrastructure.AgentContainers;

/// <summary>Aggregates multiple provider manifest catalogs, deduplicating by Id (first wins).</summary>
public sealed class CompositeProviderManifestCatalog : IProviderManifestCatalog
{
    private readonly IReadOnlyList<IProviderManifestCatalog> _sources;

    public CompositeProviderManifestCatalog(IEnumerable<IProviderManifestCatalog> sources)
        => _sources = sources.ToList();

    public IReadOnlyList<ProviderManifest> GetAll()
        => _sources
            .SelectMany(s => s.GetAll())
            .GroupBy(p => p.Id, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToList();

    public ProviderManifest? GetById(string providerId)
        => _sources
            .Select(s => s.GetById(providerId))
            .FirstOrDefault(m => m is not null);
}
