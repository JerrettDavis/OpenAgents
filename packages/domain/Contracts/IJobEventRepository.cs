using OpenAgents.Domain.Aggregates.Jobs;

namespace OpenAgents.Domain.Contracts;

/// <summary>
/// Repository contract for the append-only job event log.
/// </summary>
public interface IJobEventRepository
{
    /// <summary>Append a new event to the log.</summary>
    Task AddAsync(JobEvent jobEvent, CancellationToken cancellationToken = default);

    /// <summary>Return all events for a job, ordered by OccurredAtUtc ascending.</summary>
    Task<IReadOnlyList<JobEvent>> GetByJobIdAsync(
        Guid jobId,
        CancellationToken cancellationToken = default);
}
