using OpenAgents.Domain.Aggregates.Jobs;
using OpenAgents.Domain.Enums;

namespace OpenAgents.OrchestratorApi.Tests;

/// <summary>
/// Unit tests for the <see cref="Job"/> aggregate state-machine transitions.
/// </summary>
public sealed class JobStateMachineTests
{
    private static Job CreatePendingJob() => Job.Create(
        title:                "Test Job",
        description:          null,
        workflowDefinitionId: Guid.NewGuid(),
        workflowSlug:         "planning",
        workflowVersion:      "1.0.0",
        primaryProviderId:    "claude-code");

    [Fact]
    public void Create_SetsInitialState()
    {
        var job = CreatePendingJob();

        Assert.Equal(JobState.Pending,        job.State);
        Assert.Equal(JobOutcome.NotStarted,   job.Outcome);
        Assert.Equal(ConnectionStatus.Unknown, job.ConnectionStatus);
        Assert.Null(job.ContainerId);
        Assert.Null(job.WorkspaceHostPath);
    }

    [Fact]
    public void Queue_TransitionsFromPendingToQueued()
    {
        var job = CreatePendingJob();
        job.Queue();

        Assert.Equal(JobState.Queued, job.State);
        Assert.NotNull(job.QueuedAtUtc);
    }

    [Fact]
    public void Queue_ThrowsIfNotPending()
    {
        var job = CreatePendingJob();
        job.Queue();

        Assert.Throws<InvalidOperationException>(() => job.Queue());
    }

    [Fact]
    public void Provision_TransitionsFromQueuedToProvisioning()
    {
        var job         = CreatePendingJob();
        var workspaceId = Guid.NewGuid();
        job.Queue();
        job.Provision(workspaceId, "/workspaces/test");

        Assert.Equal(JobState.Provisioning,   job.State);
        Assert.Equal(workspaceId,             job.ActiveWorkspaceId);
        Assert.Equal("/workspaces/test",      job.WorkspaceHostPath);
        Assert.NotNull(job.ProvisionedAtUtc);
    }

    [Fact]
    public void Provision_ThrowsIfNotQueued()
    {
        var job = CreatePendingJob();
        Assert.Throws<InvalidOperationException>(() => job.Provision(Guid.NewGuid(), "/tmp"));
    }

    [Fact]
    public void Start_TransitionsFromProvisioningToRunning()
    {
        var job = CreatePendingJob();
        job.Queue();
        job.Provision(Guid.NewGuid(), "/workspaces/test");
        job.Start("container-abc123");

        Assert.Equal(JobState.Running,             job.State);
        Assert.Equal("container-abc123",           job.ContainerId);
        Assert.Equal(ConnectionStatus.Connected,   job.ConnectionStatus);
        Assert.NotNull(job.StartedAtUtc);
    }

    [Fact]
    public void Complete_SetsCompletedStateAndOutcome()
    {
        var job = CreatePendingJob();
        job.Queue();
        job.Provision(Guid.NewGuid(), "/workspaces/test");
        job.Start("ctr");
        job.Complete(JobOutcome.CompletedSuccessfully);

        Assert.Equal(JobState.Completed,                 job.State);
        Assert.Equal(JobOutcome.CompletedSuccessfully,   job.Outcome);
        Assert.Equal(ConnectionStatus.Disconnected,      job.ConnectionStatus);
        Assert.NotNull(job.FinishedAtUtc);
        Assert.NotNull(job.Duration);
    }

    [Fact]
    public void Fail_SetsErrorStateAndMessage()
    {
        var job = CreatePendingJob();
        job.Queue();
        job.Provision(Guid.NewGuid(), "/workspaces/test");
        job.Start("ctr");
        job.Fail("Something broke");

        Assert.Equal(JobState.Error,          job.State);
        Assert.Equal(JobOutcome.Failed,       job.Outcome);
        Assert.Equal("Something broke",       job.ErrorMessage);
        Assert.Equal(ConnectionStatus.Failed, job.ConnectionStatus);
    }

    [Fact]
    public void Duration_IsNullBeforeStart()
    {
        var job = CreatePendingJob();
        Assert.Null(job.Duration);
    }

    [Fact]
    public void Duration_IsCalculatedAfterCompletion()
    {
        var job = CreatePendingJob();
        job.Queue();
        job.Provision(Guid.NewGuid(), "/workspaces/test");
        job.Start("ctr");
        job.Complete(JobOutcome.CompletedSuccessfully);

        Assert.NotNull(job.Duration);
        Assert.True(job.Duration!.Value.TotalMilliseconds >= 0);
    }
}
