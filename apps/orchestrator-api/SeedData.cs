using Microsoft.EntityFrameworkCore;
using OpenAgents.Domain.Aggregates.Workflows;
using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Infrastructure;

namespace OpenAgents.OrchestratorApi.Data;

/// <summary>
/// Seeds the database with the built-in v1 workflow definitions and provider
/// definitions. Called once at startup after EnsureCreated.
/// </summary>
public static class SeedData
{
    public static async Task SeedAsync(
        OrchestratorDbContext db,
        IWorkflowManifestCatalog workflowCatalog,
        IProviderManifestCatalog providerCatalog,
        CancellationToken ct = default)
    {
        await SeedWorkflowsAsync(db, workflowCatalog, ct);
        await SeedProvidersAsync(db, providerCatalog, ct);
    }

    // ──────────────────────────────────────────────────────────
    // Workflows
    // ──────────────────────────────────────────────────────────

    private static async Task SeedWorkflowsAsync(
        OrchestratorDbContext db,
        IWorkflowManifestCatalog workflowCatalog,
        CancellationToken ct)
    {
        foreach (var manifest in workflowCatalog.GetAll())
        {
            var existing = await db.WorkflowDefinitions
                .FirstOrDefaultAsync(w => w.Slug == manifest.Slug, ct);

            if (existing is null)
            {
                db.WorkflowDefinitions.Add(WorkflowDefinition.Create(
                    name: manifest.Name,
                    slug: manifest.Slug,
                    version: manifest.Version,
                    description: manifest.Description,
                    category: manifest.Category));
                continue;
            }

            existing.UpdateMetadata(
                name: manifest.Name,
                version: manifest.Version,
                description: manifest.Description,
                category: manifest.Category,
                isExperimental: existing.IsExperimental);
        }

        await db.SaveChangesAsync(ct);
    }

    // ──────────────────────────────────────────────────────────
    // Providers
    // ──────────────────────────────────────────────────────────

    private static async Task SeedProvidersAsync(
        OrchestratorDbContext db,
        IProviderManifestCatalog providerCatalog,
        CancellationToken ct)
    {
        foreach (var manifest in providerCatalog.GetAll())
        {
            var existing = await db.ProviderDefinitions
                .FirstOrDefaultAsync(p => p.ProviderId == manifest.Id, ct);

            if (existing is null)
            {
                db.ProviderDefinitions.Add(ProviderDefinition.Create(
                    providerId: manifest.Id,
                    name: manifest.Name,
                    version: manifest.Version,
                    dockerImage: manifest.ImageRef,
                    description: manifest.Description,
                    supportLevel: manifest.SupportLevel));
                continue;
            }

            existing.UpdateMetadata(
                name: manifest.Name,
                version: manifest.Version,
                dockerImage: manifest.ImageRef,
                description: manifest.Description,
                supportLevel: manifest.SupportLevel);
        }

        await db.SaveChangesAsync(ct);
    }
}
