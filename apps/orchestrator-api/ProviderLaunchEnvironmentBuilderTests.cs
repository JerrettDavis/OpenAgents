using OpenAgents.Domain.Aggregates.Jobs;
using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Infrastructure;

namespace OpenAgents.OrchestratorApi.Tests;

public sealed class ProviderLaunchEnvironmentBuilderTests
{
    [Fact]
    public void Build_ForwardsOnlyConfiguredProviderSecrets()
    {
        Environment.SetEnvironmentVariable("OPENAI_API_KEY", "openai-test");
        Environment.SetEnvironmentVariable("GEMINI_API_KEY", "gemini-test");
        Environment.SetEnvironmentVariable("ANTHROPIC_API_KEY", "anthropic-test");

        try
        {
            var job = Job.Create(
                title: "Codex launch env",
                description: null,
                workflowDefinitionId: Guid.NewGuid(),
                workflowSlug: "planning",
                workflowVersion: "0.1.0",
                primaryProviderId: "codex",
                primaryModel: "gpt-5");

            var env = ProviderLaunchEnvironmentBuilder.Build(job, new ProviderManifest(
                Id: "codex",
                Name: "Codex",
                Version: "1.0.0",
                ImageRef: "openagents/provider-codex:latest",
                Description: null,
                SupportLevel: ProviderSupportLevel.Supported,
                RequiredEnv: ["OPENAI_API_KEY"],
                RequiredAnyEnv: [],
                PassthroughEnv: ["OPENAI_API_KEY"]));

            Assert.Equal("openai-test", env["OPENAI_API_KEY"]);
            Assert.DoesNotContain("GEMINI_API_KEY", env.Keys);
            Assert.DoesNotContain("ANTHROPIC_API_KEY", env.Keys);
        }
        finally
        {
            Environment.SetEnvironmentVariable("OPENAI_API_KEY", null);
            Environment.SetEnvironmentVariable("GEMINI_API_KEY", null);
            Environment.SetEnvironmentVariable("ANTHROPIC_API_KEY", null);
        }
    }
}
