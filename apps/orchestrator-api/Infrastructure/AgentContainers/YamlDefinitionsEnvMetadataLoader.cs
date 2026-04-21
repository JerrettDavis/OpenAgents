using Microsoft.Extensions.Options;
using OpenAgents.OrchestratorApi.Options;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace OpenAgents.OrchestratorApi.Infrastructure.AgentContainers;

/// <summary>Reads agent YAML definitions to extract env var requirements.</summary>
public sealed class YamlDefinitionsEnvMetadataLoader : IAgentContainersEnvMetadataLoader
{
    private readonly Lazy<Dictionary<string, AgentEnvMetadata>> _metadata;

    public YamlDefinitionsEnvMetadataLoader(IOptions<OrchestratorOptions> options)
    {
        _metadata = new(() => LoadAllAgentEnvMetadata(options.Value.AgentContainers.LocalRepoPath));
    }

    public (IReadOnlyList<string> Required, IReadOnlyList<string> Passthrough) GetEnvVarsForAgent(string agentId)
    {
        if (_metadata.Value.TryGetValue(agentId, out var meta))
            return (meta.Required, meta.Passthrough);
        return ([], []);
    }

    private static Dictionary<string, AgentEnvMetadata> LoadAllAgentEnvMetadata(string repoPath)
    {
        var agentsDir = Path.Combine(repoPath, "definitions", "agents");
        if (!Directory.Exists(agentsDir))
            return new();

        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();

        var result = new Dictionary<string, AgentEnvMetadata>(StringComparer.OrdinalIgnoreCase);

        foreach (var file in Directory.EnumerateFiles(agentsDir, "*.yaml"))
        {
            try
            {
                var yaml = File.ReadAllText(file);
                var agent = deserializer.Deserialize<AgentDefinitionYaml>(yaml);
                if (string.IsNullOrWhiteSpace(agent?.Id)) continue;

                var required = agent.Env?
                    .Where(e => e.Required)
                    .Select(e => e.Name)
                    .Where(n => !string.IsNullOrWhiteSpace(n))
                    .ToList() ?? [];

                var passthrough = agent.Env?
                    .Select(e => e.Name)
                    .Where(n => !string.IsNullOrWhiteSpace(n))
                    .ToList() ?? [];

                result[agent.Id] = new AgentEnvMetadata(required, passthrough);
            }
            catch
            {
                // Skip malformed YAML files
            }
        }

        return result;
    }

    private sealed record AgentEnvMetadata(IReadOnlyList<string> Required, IReadOnlyList<string> Passthrough);

    private sealed class AgentDefinitionYaml
    {
        public string? Id { get; init; }
        public List<AgentEnvVarYaml>? Env { get; init; }
    }

    private sealed class AgentEnvVarYaml
    {
        public string Name { get; init; } = "";
        public bool Required { get; init; }
        public string? Description { get; init; }
        public bool Sensitive { get; init; }
    }
}
