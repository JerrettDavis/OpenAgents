using Microsoft.EntityFrameworkCore;
using OpenAgents.Domain.Aggregates.Workflows;
using OpenAgents.Domain.Enums;

namespace OpenAgents.OrchestratorApi.Data;

/// <summary>
/// Seeds the database with the built-in v1 workflow definitions and provider
/// definitions. Called once at startup after EnsureCreated.
/// </summary>
public static class SeedData
{
    public static async Task SeedAsync(OrchestratorDbContext db, CancellationToken ct = default)
    {
        await SeedWorkflowsAsync(db, ct);
        await SeedProvidersAsync(db, ct);
    }

    // ──────────────────────────────────────────────────────────
    // Workflows
    // ──────────────────────────────────────────────────────────

    private static async Task SeedWorkflowsAsync(OrchestratorDbContext db, CancellationToken ct)
    {
        if (await db.WorkflowDefinitions.AnyAsync(cancellationToken: ct))
            return;

        var workflows = new[]
        {
            WorkflowDefinition.Create(
                name: "Planning",
                slug: "planning",
                version: "1.0.0",
                description: "Standard planning workflow — the agent analyses the workspace, " +
                             "writes a TODO.md, and produces a structured implementation plan."),
        };

        db.WorkflowDefinitions.AddRange(workflows);
        await db.SaveChangesAsync(ct);
    }

    // ──────────────────────────────────────────────────────────
    // Providers
    // ──────────────────────────────────────────────────────────

    private static async Task SeedProvidersAsync(OrchestratorDbContext db, CancellationToken ct)
    {
        if (await db.ProviderDefinitions.AnyAsync(cancellationToken: ct))
            return;

        var providers = new[]
        {
            ProviderDefinition.Create(
                providerId: ProviderDefinition.KnownIds.ClaudeCode,
                name: "Claude Code",
                version: "1.0.0",
                // Image built from providers/claude-code/Dockerfile
                dockerImage: "openagents/claude-code:latest",
                description: "Anthropic Claude Code CLI agent. Requires ANTHROPIC_API_KEY " +
                             "set in the environment.",
                supportLevel: ProviderSupportLevel.FirstClass),
        };

        db.ProviderDefinitions.AddRange(providers);
        await db.SaveChangesAsync(ct);
    }
}
