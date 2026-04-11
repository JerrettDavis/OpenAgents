using Microsoft.EntityFrameworkCore;
using OpenAgents.Domain.Aggregates.Jobs;
using OpenAgents.Domain.Contracts;
using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Data;

namespace OpenAgents.OrchestratorApi.Repositories;

/// <inheritdoc cref="IJobRepository"/>
public sealed class JobRepository : IJobRepository
{
    private readonly OrchestratorDbContext _db;

    public JobRepository(OrchestratorDbContext db) => _db = db;

    public async Task<Job?> GetByIdAsync(JobId id, CancellationToken ct = default)
        => await _db.Jobs.FindAsync([id], ct);

    public async Task<IReadOnlyList<Job>> GetAllAsync(CancellationToken ct = default)
        => await _db.Jobs
            .OrderByDescending(j => j.CreatedAtUtc)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Job>> GetByStateAsync(JobState state, CancellationToken ct = default)
        => await _db.Jobs
            .Where(j => j.State == state)
            .OrderBy(j => j.QueuedAtUtc)
            .ToListAsync(ct);

    public async Task AddAsync(Job job, CancellationToken ct = default)
    {
        _db.Jobs.Add(job);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Job job, CancellationToken ct = default)
    {
        _db.Jobs.Update(job);
        await _db.SaveChangesAsync(ct);
    }
}
