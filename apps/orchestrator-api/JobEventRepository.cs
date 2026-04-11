using Microsoft.EntityFrameworkCore;
using OpenAgents.Domain.Aggregates.Jobs;
using OpenAgents.Domain.Contracts;
using OpenAgents.OrchestratorApi.Data;

namespace OpenAgents.OrchestratorApi.Repositories;

/// <inheritdoc cref="IJobEventRepository"/>
public sealed class JobEventRepository : IJobEventRepository
{
    private readonly OrchestratorDbContext _db;

    public JobEventRepository(OrchestratorDbContext db) => _db = db;

    public async Task AddAsync(JobEvent jobEvent, CancellationToken ct = default)
    {
        _db.JobEvents.Add(jobEvent);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<JobEvent>> GetByJobIdAsync(Guid jobId, CancellationToken ct = default)
        => await _db.JobEvents
            .Where(e => e.JobId == jobId)
            .OrderBy(e => e.OccurredAtUtc)
            .ToListAsync(ct);
}
