using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;
using OpenAgents.Domain.Contracts;

namespace OpenAgents.OrchestratorApi.Infrastructure;

/// <summary>
/// Local simulation implementation of <see cref="IContainerRuntime"/>.
///
/// Used when Docker is not available or <c>UseLocalSimRuntime: true</c> is set.
/// Runs a scripted sequence of log lines with configurable delays so the
/// full orchestration pipeline (state transitions, event persistence, SSE
/// streaming) can be exercised end-to-end without a real container.
///
/// Registered as a singleton so channels survive scope disposal.
/// </summary>
public sealed class LocalSimRuntime : IContainerRuntime
{
    private sealed record SimState(
        Channel<string> LogChannel,
        Task CompletionTask,
        CancellationTokenSource Cts);

    private readonly ConcurrentDictionary<string, SimState> _sims = new();
    private readonly ILogger<LocalSimRuntime> _logger;

    public LocalSimRuntime(ILogger<LocalSimRuntime> logger) => _logger = logger;

    // ──────────────────────────────────────────────────────────
    // IContainerRuntime
    // ──────────────────────────────────────────────────────────

    public Task<string> StartContainerAsync(
        ContainerStartRequest request,
        CancellationToken cancellationToken = default)
    {
        var containerId = $"sim-{Guid.NewGuid():N}";
        var channel     = Channel.CreateBounded<string>(new BoundedChannelOptions(500)
        {
            FullMode   = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false,
        });

        // Give simulation its own CTS so it can be cancelled independently
        var cts     = new CancellationTokenSource();
        var simTask = RunSimulationAsync(containerId, request, channel.Writer, cts.Token);

        _sims[containerId] = new SimState(channel, simTask, cts);
        _logger.LogInformation("LocalSimRuntime: started simulation container {ContainerId}", containerId);
        return Task.FromResult(containerId);
    }

    public Task StopContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        if (_sims.TryGetValue(containerId, out var state))
        {
            _logger.LogInformation("LocalSimRuntime: stopping {ContainerId}", containerId);
            state.Cts.Cancel();
        }
        return Task.CompletedTask;
    }

    public async Task<int> WaitForContainerAsync(
        string containerId,
        CancellationToken cancellationToken = default)
    {
        if (!_sims.TryGetValue(containerId, out var state))
            return -1;

        try
        {
            await state.CompletionTask.WaitAsync(cancellationToken);
            _logger.LogInformation("LocalSimRuntime: container {ContainerId} completed", containerId);
            return 0;
        }
        catch (OperationCanceledException)
        {
            return -1;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LocalSimRuntime: simulation for {ContainerId} faulted", containerId);
            return -1;
        }
        finally
        {
            _sims.TryRemove(containerId, out var removed);
            removed?.Cts.Dispose();
        }
    }

    public async IAsyncEnumerable<string> StreamLogsAsync(
        string containerId,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (!_sims.TryGetValue(containerId, out var state))
            yield break;

        await foreach (var line in state.LogChannel.Reader.ReadAllAsync(cancellationToken))
            yield return line;
    }

    // ──────────────────────────────────────────────────────────
    // Simulation script
    // ──────────────────────────────────────────────────────────

    private async Task RunSimulationAsync(
        string containerId,
        ContainerStartRequest request,
        ChannelWriter<string> writer,
        CancellationToken ct)
    {
        var jobId      = request.EnvironmentVariables.GetValueOrDefault("JOB_ID", "?");
        var workflowId = request.EnvironmentVariables.GetValueOrDefault("WORKFLOW_ID", "?");
        var providerId = request.EnvironmentVariables.GetValueOrDefault("PROVIDER_ID", "?");

        var script = new[]
        {
            $"[sim] ── OpenAgents Local Simulation ──────────────────────────",
            $"[sim] Job      : {jobId}",
            $"[sim] Workflow : {workflowId}",
            $"[sim] Provider : {providerId}",
            $"[sim] Workspace: {request.WorkspaceContainerPath}",
            "[sim] ─────────────────────────────────────────────────────────",
            "[sim] Initialising workspace…",
            "[sim] Reading TODO.md…",
            "[sim] Detected 4 tasks across 4 stages.",
            "[sim] ── Stage: setup ─────────────────────────────────────────",
            "[sim] [setup] Checking environment…",
            "[sim] [setup] Workspace structure verified.",
            "[sim] [setup] Stage complete. ✓",
            "[sim] ── Stage: plan ──────────────────────────────────────────",
            "[sim] [plan] task-001: Analysing requirements…",
            "[sim] [plan] task-001: Requirements identified. Writing TODO.md…",
            "[sim] [plan] task-001: ✓ Done",
            "[sim] [plan] task-002: Creating structured plan…",
            "[sim] [plan] task-002: Plan written to TODO.md.",
            "[sim] [plan] task-002: ✓ Done",
            "[sim] [plan] Stage complete. ✓",
            "[sim] ── Stage: implement ──────────────────────────────────────",
            "[sim] [implement] task-003: Executing implementation…",
            "[sim] [implement] task-003: Changes applied.",
            "[sim] [implement] task-003: ✓ Done",
            "[sim] [implement] Stage complete. ✓",
            "[sim] ── Stage: verify ────────────────────────────────────────",
            "[sim] [verify] task-004: Running verification…",
            "[sim] [verify] task-004: Verification passed.",
            "[sim] [verify] Writing planning report to .agent-orch/reports/",
            "[sim] [verify] task-004: ✓ Done",
            "[sim] [verify] Stage complete. ✓",
            "[sim] ─────────────────────────────────────────────────────────",
            "[sim] All stages complete. Job finished successfully.",
            "[sim] Exit 0.",
        };

        try
        {
            foreach (var line in script)
            {
                ct.ThrowIfCancellationRequested();
                await writer.WriteAsync(line, ct);
                await Task.Delay(350, ct);
            }
        }
        catch (OperationCanceledException) { /* graceful stop */ }
        finally
        {
            writer.TryComplete();
        }
    }
}
