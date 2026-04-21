using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Infrastructure;
using OpenAgents.OrchestratorApi.Infrastructure.AgentContainers;
using OpenAgents.OrchestratorApi.Options;
using MsOptions = Microsoft.Extensions.Options.Options;

namespace OpenAgents.OrchestratorApi.Tests;

public sealed class AgentContainersCatalogTests
{
    private static readonly OrchestratorOptions DefaultOptions = new()
    {
        AgentContainers = new AgentContainersOptions
        {
            Enabled = true,
            Mode = "local",
            LocalRepoPath = GetAgentContainersRepoPath(),
            LoadEnvMetadataFromDefinitions = true,
            ProviderIdPrefix = "ac-"
        }
    };

    [Fact]
    public void LocalCatalog_LoadsTagPolicyImages()
    {
        var catalog = CreateLocalCatalog();
        var all = catalog.GetAll();

        Assert.NotEmpty(all);
        Assert.All(all, m => Assert.StartsWith("ac-", m.Id));
    }

    [Fact]
    public void LocalCatalog_ExcludesNonTagPolicyImages()
    {
        var catalog = CreateLocalCatalog();
        var all = catalog.GetAll();

        // Should only contain tag-policy-image entries (e.g., dotnet-claude, dotnet-codex)
        // Not base, combo, agent, or agent-image entries
        Assert.All(all, m => Assert.False(string.IsNullOrEmpty(m.ImageRef)));
        Assert.All(all, m => Assert.Contains("ghcr.io", m.ImageRef));
    }

    [Fact]
    public void LocalCatalog_DotnetClaude_HasCorrectImageRef()
    {
        var catalog = CreateLocalCatalog();
        var provider = catalog.GetById("ac-dotnet-claude");

        Assert.NotNull(provider);
        Assert.Equal("ghcr.io/agentcontainers/ac-dotnet:claude-0.1.0", provider!.ImageRef);
        Assert.Equal(".NET-first Claude image", provider.Name);
        Assert.Equal("0.1.0", provider.Version);
    }

    [Fact]
    public void LocalCatalog_LoadsEnvVarsFromDefinitions()
    {
        var catalog = CreateLocalCatalog();
        var provider = catalog.GetById("ac-dotnet-claude");

        Assert.NotNull(provider);
        Assert.Contains("ANTHROPIC_API_KEY", provider!.RequiredEnv);
        Assert.Contains("ANTHROPIC_API_KEY", provider.PassthroughEnv);
    }

    [Fact]
    public void LocalCatalog_WithNullEnvLoader_ReturnsEmptyEnvVars()
    {
        var envLoader = new NullEnvMetadataLoader();
        var catalog = new LocalFileAgentContainersCatalog(
            MsOptions.Create(DefaultOptions),
            envLoader);

        var provider = catalog.GetById("ac-dotnet-claude");

        Assert.NotNull(provider);
        Assert.Empty(provider!.RequiredEnv);
    }

    [Fact]
    public void YamlEnvLoader_LoadsClaudeEnvVars()
    {
        var loader = new YamlDefinitionsEnvMetadataLoader(MsOptions.Create(DefaultOptions));

        var (required, passthrough) = loader.GetEnvVarsForAgent("claude");

        Assert.Contains("ANTHROPIC_API_KEY", required);
        Assert.Contains("CLAUDE_CONFIG_DIR", passthrough);
        Assert.Contains("CLAUDE_WORKSPACE", passthrough);
    }

    [Fact]
    public void YamlEnvLoader_UnknownAgent_ReturnsEmpty()
    {
        var loader = new YamlDefinitionsEnvMetadataLoader(MsOptions.Create(DefaultOptions));

        var (required, passthrough) = loader.GetEnvVarsForAgent("nonexistent-agent");

        Assert.Empty(required);
        Assert.Empty(passthrough);
    }

    [Fact]
    public void CompositeCatalog_MergesBothSources()
    {
        var fsCatalog = new FileSystemProviderManifestCatalog(
            new TestHostEnvironment(),
            MsOptions.Create(new OrchestratorOptions { Paths = new PathsOptions { ProvidersDir = "../../providers" } }));

        var acCatalog = CreateLocalCatalog();

        var composite = new CompositeProviderManifestCatalog([fsCatalog, acCatalog]);
        var all = composite.GetAll();

        // Should have both filesystem providers (claude-code, codex, etc.) and AC providers (ac-dotnet-claude, etc.)
        Assert.Contains(all, m => m.Id == "claude-code");
        Assert.Contains(all, m => m.Id == "ac-dotnet-claude");
    }

    [Fact]
    public void CompositeCatalog_FirstSourceWins_OnIdCollision()
    {
        var manifest1 = new ProviderManifest("test-id", "Source 1", "1.0", "image1:latest",
            null, ProviderSupportLevel.FirstClass, [], [], []);
        var manifest2 = new ProviderManifest("test-id", "Source 2", "2.0", "image2:latest",
            null, ProviderSupportLevel.Experimental, [], [], []);

        var catalog1 = new StubCatalog([manifest1]);
        var catalog2 = new StubCatalog([manifest2]);

        var composite = new CompositeProviderManifestCatalog([catalog1, catalog2]);

        var result = composite.GetById("test-id");
        Assert.NotNull(result);
        Assert.Equal("Source 1", result!.Name);
    }

    [Fact]
    public void CompositeCatalog_GetById_SearchesAllSources()
    {
        var manifest = new ProviderManifest("only-in-second", "Second Source", "1.0", "img:tag",
            null, ProviderSupportLevel.Experimental, [], [], []);

        var catalog1 = new StubCatalog([]);
        var catalog2 = new StubCatalog([manifest]);

        var composite = new CompositeProviderManifestCatalog([catalog1, catalog2]);

        var result = composite.GetById("only-in-second");
        Assert.NotNull(result);
        Assert.Equal("Second Source", result!.Name);
    }

    [Fact]
    public void LocalCatalog_ImageRefOverride_UsesEnvironmentVariable()
    {
        const string overrideImage = "ghcr.io/custom/override:test";
        Environment.SetEnvironmentVariable("AC_DOTNET_CLAUDE_IMAGE_REF", overrideImage);
        try
        {
            var catalog = CreateLocalCatalog();
            var provider = catalog.GetById("ac-dotnet-claude");

            Assert.NotNull(provider);
            Assert.Equal(overrideImage, provider!.ImageRef);
        }
        finally
        {
            Environment.SetEnvironmentVariable("AC_DOTNET_CLAUDE_IMAGE_REF", null);
        }
    }

    private static LocalFileAgentContainersCatalog CreateLocalCatalog()
    {
        var envLoader = new YamlDefinitionsEnvMetadataLoader(MsOptions.Create(DefaultOptions));
        return new LocalFileAgentContainersCatalog(MsOptions.Create(DefaultOptions), envLoader);
    }

    private static string GetAgentContainersRepoPath()
    {
        // Check common locations
        var candidates = new[] { "C:/git/AgentContainers", "../../../AgentContainers" };
        foreach (var path in candidates)
        {
            var resolved = Path.GetFullPath(path);
            if (File.Exists(Path.Combine(resolved, "generated", "image-catalog.json")))
                return resolved;
        }
        return "C:/git/AgentContainers";
    }

    private sealed class StubCatalog(IReadOnlyList<ProviderManifest> manifests) : IProviderManifestCatalog
    {
        public IReadOnlyList<ProviderManifest> GetAll() => manifests;
        public ProviderManifest? GetById(string providerId)
            => manifests.FirstOrDefault(m => string.Equals(m.Id, providerId, StringComparison.OrdinalIgnoreCase));
    }
}
