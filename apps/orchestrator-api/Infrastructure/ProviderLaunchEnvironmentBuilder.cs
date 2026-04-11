using OpenAgents.Domain.Aggregates.Jobs;

namespace OpenAgents.OrchestratorApi.Infrastructure;

public static class ProviderLaunchEnvironmentBuilder
{
    public static IReadOnlyDictionary<string, string> Build(
        Job job,
        ProviderManifest? providerManifest,
        string? workspacePath = null)
    {
        workspacePath ??= $"/workspace/{SanitiseName(job.Title)}";
        var vars = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["JOB_ID"] = job.Id.Value.ToString(),
            ["WORKFLOW_ID"] = job.WorkflowSlug,
            ["WORKFLOW_VERSION"] = job.WorkflowVersion,
            ["STAGE_ID"] = "setup",
            ["TASK_ID"] = "task-001",
            ["PROVIDER_ID"] = job.PrimaryProviderId,
            ["PRIMARY_MODEL"] = job.PrimaryModel ?? string.Empty,
            ["ITERATIONS"] = "5",
            ["ITERATIONS__STAGE"] = "3",
            ["ITERATIONS__TASK"] = "2",
            ["WORKSPACE_PATH"] = workspacePath,
            ["MAILBOX_PATH"] = $"{workspacePath}/.mailbox",
        };

        foreach (var envVarName in providerManifest?.PassthroughEnv ?? [])
        {
            var envValue = Environment.GetEnvironmentVariable(envVarName);
            if (!string.IsNullOrWhiteSpace(envValue))
                vars[envVarName] = envValue;
        }

        return vars;
    }

    private static string SanitiseName(string title)
    {
        var safe = new string(title
            .ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray())
            .Trim('-');
        return safe[..Math.Min(50, safe.Length)];
    }
}
