using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Data;

namespace OpenAgents.OrchestratorApi.Endpoints;

public sealed record ProviderDto(
    Guid Id,
    string ProviderId,
    string Name,
    string Version,
    string DockerImage,
    string? Description,
    string SupportLevel,
    bool IsEnabled);

public sealed record CreateProviderRequest(
    string ProviderId,
    string Name,
    string Version,
    string DockerImage,
    string? Description,
    string? SupportLevel,
    bool? IsEnabled);

public sealed record UpdateProviderRequest(
    string? Name,
    string? Version,
    string? DockerImage,
    string? Description,
    string? SupportLevel,
    bool? IsEnabled);

public static class ProviderEndpoints
{
    public static void MapProviderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/providers").WithTags("Providers");

        group.MapGet("", ListProvidersAsync)
            .WithName("ListProviders")
            .WithSummary("List all registered provider definitions");

        group.MapGet("/{providerId}", GetProviderAsync)
            .WithName("GetProvider")
            .WithSummary("Get a provider by slug ID");

        group.MapPost("", CreateProviderAsync)
            .WithName("CreateProvider")
            .WithSummary("Create a provider definition");

        group.MapPut("/{providerId}", UpdateProviderAsync)
            .WithName("UpdateProvider")
            .WithSummary("Update provider metadata");
    }

    private static async Task<IResult> ListProvidersAsync(
        OrchestratorDbContext db,
        [FromQuery(Name = "include_disabled")] bool? includeDisabled,
        CancellationToken ct)
    {
        var query = db.ProviderDefinitions.AsQueryable();
        if (includeDisabled != true)
            query = query.Where(p => p.IsEnabled);

        var providers = await query.OrderBy(p => p.Name).ToListAsync(ct);

        return Results.Ok(providers.Select(ToDto));
    }

    private static async Task<IResult> GetProviderAsync(
        [FromRoute] string providerId,
        OrchestratorDbContext db,
        CancellationToken ct)
    {
        var provider = await db.ProviderDefinitions
            .FirstOrDefaultAsync(p => p.ProviderId == providerId, ct);

        return provider is null
            ? Results.Json(
                new
                {
                    error = new
                    {
                        code = "NOT_FOUND",
                        message = $"Provider '{providerId}' not found",
                        detail = (string?)null
                    }
                },
                statusCode: 404)
            : Results.Ok(new { Provider = ToDto(provider) });
    }

    private static async Task<IResult> CreateProviderAsync(
        [FromBody] CreateProviderRequest request,
        OrchestratorDbContext db,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ProviderId))
            return BadRequest("provider_id is required");
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("name is required");
        if (string.IsNullOrWhiteSpace(request.Version))
            return BadRequest("version is required");
        if (string.IsNullOrWhiteSpace(request.DockerImage))
            return BadRequest("docker_image is required");

        var existing = await db.ProviderDefinitions
            .AnyAsync(p => p.ProviderId == request.ProviderId.Trim(), ct);
        if (existing)
            return BadRequest($"Provider '{request.ProviderId}' already exists");

        var support = ParseSupportLevel(request.SupportLevel);
        if (support is null)
            return BadRequest($"Invalid support_level '{request.SupportLevel}'");

        var provider = Domain.Aggregates.Workflows.ProviderDefinition.Create(
            providerId: request.ProviderId.Trim(),
            name: request.Name.Trim(),
            version: request.Version.Trim(),
            dockerImage: request.DockerImage.Trim(),
            description: string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            supportLevel: support.Value,
            isEnabled: request.IsEnabled ?? true);

        db.ProviderDefinitions.Add(provider);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/v1/providers/{provider.ProviderId}", new { Provider = ToDto(provider) });
    }

    private static async Task<IResult> UpdateProviderAsync(
        [FromRoute] string providerId,
        [FromBody] UpdateProviderRequest request,
        OrchestratorDbContext db,
        CancellationToken ct)
    {
        var provider = await db.ProviderDefinitions
            .FirstOrDefaultAsync(p => p.ProviderId == providerId, ct);
        if (provider is null)
            return Results.Json(
                new
                {
                    error = new
                    {
                        code = "NOT_FOUND",
                        message = $"Provider '{providerId}' not found",
                        detail = (string?)null
                    }
                },
                statusCode: 404);

        var support = request.SupportLevel is null ? provider.SupportLevel : ParseSupportLevel(request.SupportLevel);
        if (support is null)
            return BadRequest($"Invalid support_level '{request.SupportLevel}'");

        provider.UpdateMetadata(
            name: string.IsNullOrWhiteSpace(request.Name) ? provider.Name : request.Name.Trim(),
            version: string.IsNullOrWhiteSpace(request.Version) ? provider.Version : request.Version.Trim(),
            dockerImage: string.IsNullOrWhiteSpace(request.DockerImage) ? provider.DockerImage : request.DockerImage.Trim(),
            description: request.Description is null ? provider.Description : (string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim()),
            supportLevel: support.Value);

        if (request.IsEnabled.HasValue)
            provider.SetEnabled(request.IsEnabled.Value);

        await db.SaveChangesAsync(ct);

        return Results.Ok(new { Provider = ToDto(provider) });
    }

    private static ProviderSupportLevel? ParseSupportLevel(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return ProviderSupportLevel.FirstClass;

        return Enum.TryParse<ProviderSupportLevel>(value, true, out var parsed)
            ? parsed
            : null;
    }

    private static IResult BadRequest(string message) => Results.Json(
        new { error = new { code = "BAD_REQUEST", message, detail = (string?)null } },
        statusCode: 400);

    private static ProviderDto ToDto(Domain.Aggregates.Workflows.ProviderDefinition p) => new(
        Id: p.Id.Value,
        ProviderId: p.ProviderId,
        Name: p.Name,
        Version: p.Version,
        DockerImage: p.DockerImage,
        Description: p.Description,
        SupportLevel: p.SupportLevel.ToString(),
        IsEnabled: p.IsEnabled);
}
