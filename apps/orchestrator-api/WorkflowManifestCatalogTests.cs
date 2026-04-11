using OpenAgents.OrchestratorApi.Infrastructure;
using OpenAgents.OrchestratorApi.Options;

namespace OpenAgents.OrchestratorApi.Tests;

public sealed class WorkflowManifestCatalogTests
{
    [Fact]
    public void WorkflowCatalog_LoadsPlanningCompatibilityMatrix()
    {
        var catalog = CreateCatalog();

        var planning = Assert.Single(catalog.GetAll(), workflow => workflow.Slug == "planning");

        Assert.Equal(
            ["claude-code", "codex", "copilot", "gemini", "opencode"],
            planning.ProviderCompatibility.Select(pc => pc.ProviderId).OrderBy(id => id).ToArray());
    }

    private static FileSystemWorkflowManifestCatalog CreateCatalog()
        => new(
            new TestHostEnvironment(),
            Microsoft.Extensions.Options.Options.Create(new OrchestratorOptions
            {
                Paths = new PathsOptions { WorkflowsDir = "../../workflows" }
            }));
}
