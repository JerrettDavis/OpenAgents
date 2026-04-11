using System.Runtime.CompilerServices;
using System.Threading.Channels;
using System.Collections.Concurrent;

namespace OpenAgents.OrchestratorApi.Infrastructure;

/// <summary>
/// In-memory SSE fan-out hub.
///
/// Each SSE client subscribes to a specific job's event stream via
/// <see cref="SubscribeAsync"/>. When the orchestrator emits an event
/// it calls <see cref="Broadcast"/> to push the serialized payload to
/// all subscribers for that job.
///
/// Uses bounded channels (100 items) with DropOldest policy to prevent
/// slow consumers from consuming unbounded memory.
/// </summary>
public sealed class SseHub
{
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, Channel<string>>> _subscriptions
        = new();

    // ──────────────────────────────────────────────────────────
    // Subscribe
    // ──────────────────────────────────────────────────────────

    /// <summary>
    /// Subscribe to a job's event stream. Yields serialized SSE payloads
    /// until the job stream is completed or the <paramref name="ct"/> is cancelled.
    /// </summary>
    public async IAsyncEnumerable<string> SubscribeAsync(
        Guid jobId,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var clientId = Guid.NewGuid();
        var channel  = Channel.CreateBounded<string>(new BoundedChannelOptions(100)
        {
            FullMode            = BoundedChannelFullMode.DropOldest,
            SingleReader        = true,
            SingleWriter        = false,
            AllowSynchronousContinuations = false
        });

        var jobClients = _subscriptions.GetOrAdd(
            jobId,
            _ => new ConcurrentDictionary<Guid, Channel<string>>());

        jobClients.TryAdd(clientId, channel);

        try
        {
            await foreach (var item in channel.Reader.ReadAllAsync(ct))
                yield return item;
        }
        finally
        {
            jobClients.TryRemove(clientId, out _);
            if (jobClients.IsEmpty)
                _subscriptions.TryRemove(jobId, out _);
        }
    }

    // ──────────────────────────────────────────────────────────
    // Broadcast
    // ──────────────────────────────────────────────────────────

    /// <summary>
    /// Broadcast a JSON-serialized SSE payload to all clients currently
    /// subscribed to <paramref name="jobId"/>. Fire-and-forget; slow or
    /// disconnected clients are dropped silently.
    /// </summary>
    public void Broadcast(Guid jobId, string payloadJson)
    {
        if (!_subscriptions.TryGetValue(jobId, out var clients)) return;
        foreach (var (_, ch) in clients)
            ch.Writer.TryWrite(payloadJson);
    }

    /// <summary>
    /// Signal that no more events will be emitted for this job.
    /// All subscriber channels are completed, causing their async-foreach loops to exit.
    /// </summary>
    public void CompleteJobStream(Guid jobId)
    {
        if (!_subscriptions.TryGetValue(jobId, out var clients)) return;
        foreach (var (_, ch) in clients)
            ch.Writer.TryComplete();
    }

    /// <summary>Number of active subscribers across all jobs (for diagnostics).</summary>
    public int TotalSubscriberCount
        => _subscriptions.Values.Sum(d => d.Count);
}
