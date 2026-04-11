using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenAgents.OrchestratorApi.Data;

namespace OpenAgents.OrchestratorApi.Endpoints;

public sealed record WorkflowDto(
    Guid Id,
    string Slug,
    string Name,
    string Version,
    string? Description,
    string Category,
    bool IsEnabled,
    bool IsExperimental,
    ProviderCompatibilityDto[] ProviderCompatibility);

public sealed record ProviderCompatibilityDto(string ProviderId, string Support);

public sealed record CreateWorkflowRequest(
    string Name,
    string Slug,
    string Version,
    string? Description,
    string? Category,
    bool? IsEnabled,
    bool? IsExperimental);

public sealed record UpdateWorkflowRequest(
    string? Name,
    string? Version,
    string? Description,
    string? Category,
    bool? IsEnabled,
    bool? IsExperimental);

public static class WorkflowEndpoints
{
    public static void MapWorkflowEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/workflows").WithTags("Workflows");

        group.MapGet("", ListWorkflowsAsync)
            .WithName("ListWorkflows")
            .WithSummary("List all workflow definitions");

        group.MapGet("/{idOrSlug}", GetWorkflowAsync)
            .WithName("GetWorkflow")
            .WithSummary("Get a workflow by UUID or slug");

        group.MapPost("", CreateWorkflowAsync)
            .WithName("CreateWorkflow")
            .WithSummary("Create a workflow definition");

        group.MapPut("/{idOrSlug}", UpdateWorkflowAsync)
            .WithName("UpdateWorkflow")
            .WithSummary("Update workflow metadata");
    }

    private static async Task<IResult> ListWorkflowsAsync(
        OrchestratorDbContext db,
        [FromQuery(Name = "include_disabled")] bool? includeDisabled,
        CancellationToken ct)
    {
        var query = db.WorkflowDefinitions.AsQueryable();
        if (includeDisabled != true)
            query = query.Where(w => w.IsEnabled);

        var workflows = await query.OrderBy(w => w.Name).ToListAsync(ct);

        return Results.Ok(new { Items = workflows.Select(ToDto) });
    }

    private static async Task<IResult> GetWorkflowAsync(
        [FromRoute] string idOrSlug,
        OrchestratorDbContext db,
        CancellationToken ct)
    {
        var workflow = await FindWorkflowAsync(idOrSlug, db, ct);

        return workflow is null
            ? Results.Json(
                new
                {
                    error = new
                    {
                        code = "NOT_FOUND",
                        message = $"Workflow '{idOrSlug}' not found",
                        detail = (string?)null
                    }
                },
                statusCode: 404)
            : Results.Ok(new { Workflow = ToDto(workflow) });
    }

    private static async Task<IResult> CreateWorkflowAsync(
        [FromBody] CreateWorkflowRequest request,
        OrchestratorDbContext db,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("name is required");
        if (string.IsNullOrWhiteSpace(request.Slug))
            return BadRequest("slug is required");
        if (string.IsNullOrWhiteSpace(request.Version))
            return BadRequest("version is required");

        var slug = request.Slug.Trim();
        var exists = await db.WorkflowDefinitions.AnyAsync(w => w.Slug == slug, ct);
        if (exists)
            return BadRequest($"Workflow slug '{slug}' already exists");

        var workflow = Domain.Aggregates.Workflows.WorkflowDefinition.Create(
            name: request.Name.Trim(),
            slug: slug,
            version: request.Version.Trim(),
            description: string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            category: string.IsNullOrWhiteSpace(request.Category) ? "general" : request.Category.Trim(),
            isExperimental: request.IsExperimental ?? false,
            isEnabled: request.IsEnabled ?? true);

        db.WorkflowDefinitions.Add(workflow);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/v1/workflows/{workflow.Slug}", new { Workflow = ToDto(workflow) });
    }

    private static async Task<IResult> UpdateWorkflowAsync(
        [FromRoute] string idOrSlug,
        [FromBody] UpdateWorkflowRequest request,
        OrchestratorDbContext db,
        CancellationToken ct)
    {
        var workflow = await FindWorkflowAsync(idOrSlug, db, ct);
        if (workflow is null)
            return Results.Json(
                new
                {
                    error = new
                    {
                        code = "NOT_FOUND",
                        message = $"Workflow '{idOrSlug}' not found",
                        detail = (string?)null
                    }
                },
                statusCode: 404);

        workflow.UpdateMetadata(
            name: string.IsNullOrWhiteSpace(request.Name) ? workflow.Name : request.Name.Trim(),
            version: string.IsNullOrWhiteSpace(request.Version) ? workflow.Version : request.Version.Trim(),
            description: request.Description is null ? workflow.Description : (string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim()),
            category: request.Category is null ? workflow.Category : (string.IsNullOrWhiteSpace(request.Category) ? "general" : request.Category.Trim()),
            isExperimental: request.IsExperimental ?? workflow.IsExperimental);

        if (request.IsEnabled.HasValue)
            workflow.SetEnabled(request.IsEnabled.Value);

        await db.SaveChangesAsync(ct);

        return Results.Ok(new { Workflow = ToDto(workflow) });
    }

    private static async Task<Domain.Aggregates.Workflows.WorkflowDefinition?> FindWorkflowAsync(
        string idOrSlug,
        OrchestratorDbContext db,
        CancellationToken ct)
    {
        if (Guid.TryParse(idOrSlug, out var guid))
            return await db.WorkflowDefinitions.FirstOrDefaultAsync(w => w.Id.Value == guid, ct);

        return await db.WorkflowDefinitions.FirstOrDefaultAsync(w => w.Slug == idOrSlug, ct);
    }

    private static IResult BadRequest(string message) => Results.Json(
        new { error = new { code = "BAD_REQUEST", message, detail = (string?)null } },
        statusCode: 400);

    private static WorkflowDto ToDto(Domain.Aggregates.Workflows.WorkflowDefinition w) => new(
        Id: w.Id.Value,
        Slug: w.Slug,
        Name: w.Name,
        Version: w.Version,
        Description: w.Description,
        Category: w.Category ?? "general",
        IsEnabled: w.IsEnabled,
        IsExperimental: w.IsExperimental,
        ProviderCompatibility: []);
}
