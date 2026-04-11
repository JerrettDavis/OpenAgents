namespace OpenAgents.Domain.Contracts;

/// <summary>
/// Repository contract for Jobs. Implementations live in the infrastructure
/// layer (apps/orchestrator-api). This keeps the domain free of persistence concerns.
/// </summary>
public interface IJobRepository
{
    Task<Domain.Aggregates.Jobs.Job?> GetByIdAsync(
        Domain.Aggregates.Jobs.JobId id,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Domain.Aggregates.Jobs.Job>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Domain.Aggregates.Jobs.Job>> GetByStateAsync(
        Domain.Enums.JobState state,
        CancellationToken cancellationToken = default);

    Task AddAsync(
        Domain.Aggregates.Jobs.Job job,
        CancellationToken cancellationToken = default);

    Task UpdateAsync(
        Domain.Aggregates.Jobs.Job job,
        CancellationToken cancellationToken = default);
}
