using OpenAgents.OrchestratorApi.Infrastructure;
using OpenAgents.OrchestratorApi.Options;

namespace OpenAgents.OrchestratorApi.Tests;

public sealed class ProviderManifestCatalogTests
{
    [Fact]
    public void ProviderCatalog_LoadsRequiredProviderSet()
    {
        var catalog = CreateCatalog();

        Assert.Equal(
            ["claude-code", "codex", "copilot", "gemini", "opencode"],
            catalog.GetAll().Select(p => p.Id).OrderBy(id => id).ToArray());
    }

    [Fact]
    public void ProviderCatalog_UsesImageOverrideEnvironmentVariables()
    {
        const string overrideImage = "ghcr.io/example/provider-codex:test";
        Environment.SetEnvironmentVariable("CODEX_IMAGE_REF", overrideImage);
        try
        {
            var catalog = CreateCatalog();

            Assert.Equal(overrideImage, catalog.GetById("codex")?.ImageRef);
        }
        finally
        {
            Environment.SetEnvironmentVariable("CODEX_IMAGE_REF", null);
        }
    }

    [Fact]
    public void ProviderCatalog_LoadsOpenCodeAnyCredentialRequirement()
    {
        var catalog = CreateCatalog();

        var manifest = catalog.GetById("opencode");
        Assert.NotNull(manifest);
        Assert.Empty(manifest!.RequiredEnv);
        Assert.Equal(
            ["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GH_TOKEN", "GITHUB_TOKEN", "OPENAI_API_KEY"],
            manifest.RequiredAnyEnv.OrderBy(value => value).ToArray());
    }

    [Fact]
    public void ProviderCatalog_LoadsCopilotAnyCredentialRequirement()
    {
        var catalog = CreateCatalog();

        var manifest = catalog.GetById("copilot");
        Assert.NotNull(manifest);
        Assert.Empty(manifest!.RequiredEnv);
        Assert.Equal(
            ["GH_TOKEN", "GITHUB_TOKEN"],
            manifest.RequiredAnyEnv.OrderBy(value => value).ToArray());
    }

    private static FileSystemProviderManifestCatalog CreateCatalog()
        => new(
            new TestHostEnvironment(),
            Microsoft.Extensions.Options.Options.Create(new OrchestratorOptions
            {
                Paths = new PathsOptions { ProvidersDir = "../../providers" }
            }));
}
