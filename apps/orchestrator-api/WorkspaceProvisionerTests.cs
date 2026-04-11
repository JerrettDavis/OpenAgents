using OpenAgents.Domain.Aggregates.Jobs;
using OpenAgents.Domain.Enums;
using OpenAgents.OrchestratorApi.Infrastructure;

namespace OpenAgents.OrchestratorApi.Tests;

/// <summary>
/// Tests for <see cref="WorkspaceProvisioner"/> — verifies that the correct
/// directory tree and seed files are created per the Workspace Contract.
/// </summary>
public sealed class WorkspaceProvisionerTests : IDisposable
{
    private readonly string _tempRoot;
    private readonly WorkspaceProvisioner _provisioner;

    public WorkspaceProvisionerTests()
    {
        _tempRoot   = Path.Combine(Path.GetTempPath(), $"oa-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);

        var logger  = Microsoft.Extensions.Logging.Abstractions.NullLogger<WorkspaceProvisioner>.Instance;
        _provisioner = new WorkspaceProvisioner(logger);
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempRoot, recursive: true); } catch { }
    }

    // ──────────────────────────────────────────────────────────
    // Directory structure
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Provision_CreatesAgentOrchDirectories()
    {
        var job = CreateTestJob();
        await _provisioner.ProvisionAsync(job, "Planning");

        AssertDir(".agent-orch");
        AssertDir(".agent-orch/events");
        AssertDir(".agent-orch/logs");
        AssertDir(".agent-orch/artifacts");
        AssertDir(".agent-orch/reports");
        AssertDir(".agent-orch/metrics");
        AssertDir(".agent-orch/stages");
        AssertDir(".agent-orch/tasks");
        AssertDir(".agent-orch/mailbox-index");
    }

    [Fact]
    public async Task Provision_CreatesMailboxDirectories()
    {
        var job = CreateTestJob();
        await _provisioner.ProvisionAsync(job, "Planning");

        AssertDir(".mailbox");
        AssertDir(".mailbox/inbox");
        AssertDir(".mailbox/outbox");
        AssertDir(".mailbox/drafts");
        AssertDir(".mailbox/sent");
        AssertDir(".mailbox/archived");
    }

    // ──────────────────────────────────────────────────────────
    // Seed files
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Provision_CreatesJobJson()
    {
        var job = CreateTestJob();
        await _provisioner.ProvisionAsync(job, "Planning");

        var path = Path.Combine(_tempRoot, ".agent-orch", "job.json");
        Assert.True(File.Exists(path), "job.json must exist");

        var content = await File.ReadAllTextAsync(path);
        Assert.Contains(job.Id.Value.ToString(), content);
        Assert.Contains(job.WorkflowSlug,        content);
    }

    [Fact]
    public async Task Provision_CreatesWorkflowJson()
    {
        var job = CreateTestJob();
        await _provisioner.ProvisionAsync(job, "Planning");

        var path = Path.Combine(_tempRoot, ".agent-orch", "workflow.json");
        Assert.True(File.Exists(path), "workflow.json must exist");
    }

    [Fact]
    public async Task Provision_CreatesStateJson()
    {
        var job = CreateTestJob();
        await _provisioner.ProvisionAsync(job, "Planning");

        var path = Path.Combine(_tempRoot, ".agent-orch", "state.json");
        Assert.True(File.Exists(path), "state.json must exist");

        var content = await File.ReadAllTextAsync(path);
        Assert.Contains("Provisioning", content); // job state at provision time
    }

    [Fact]
    public async Task Provision_CreatesTodoMd()
    {
        var job = CreateTestJob();
        await _provisioner.ProvisionAsync(job, "Planning");

        var path = Path.Combine(_tempRoot, "TODO.md");
        Assert.True(File.Exists(path), "TODO.md must exist at workspace root");

        var content = await File.ReadAllTextAsync(path);
        Assert.Contains(job.Id.Value.ToString(), content); // job_id in metadata
        Assert.Contains("## Stages",              content);
        Assert.Contains("## Tasks",               content);
        Assert.Contains("## Metadata",            content);
    }

    [Fact]
    public async Task Provision_TodoMd_IsParseable()
    {
        var job = CreateTestJob();
        await _provisioner.ProvisionAsync(job, "Planning");

        var todoPath = Path.Combine(_tempRoot, "TODO.md");
        var parsed   = await TodoParser.ParseFileAsync(todoPath);

        Assert.Equal(job.Id.Value.ToString(), parsed.Metadata.JobId);
        Assert.Equal(job.WorkflowSlug,        parsed.Metadata.Workflow);
        Assert.NotEmpty(parsed.Stages);
        Assert.NotEmpty(parsed.Tasks);
    }

    [Fact]
    public async Task Provision_CreatesPendingNotifications()
    {
        var job = CreateTestJob();
        await _provisioner.ProvisionAsync(job, "Planning");

        var path = Path.Combine(_tempRoot, ".agent-orch", "mailbox-index", "pending-notifications.md");
        Assert.True(File.Exists(path));
    }

    // ──────────────────────────────────────────────────────────
    // Idempotency (re-provision should not throw)
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Provision_IsIdempotent()
    {
        var job = CreateTestJob();
        await _provisioner.ProvisionAsync(job, "Planning");
        // Second call should not throw even though dirs already exist
        await _provisioner.ProvisionAsync(job, "Planning");
    }

    // ──────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────

    private Job CreateTestJob()
    {
        var workflowId = Guid.NewGuid();
        var job = Job.Create(
            title:                "Test Job",
            description:          "Unit test job",
            workflowDefinitionId: workflowId,
            workflowSlug:         "planning",
            workflowVersion:      "1.0.0",
            primaryProviderId:    "claude-code");

        job.Queue();
        job.Provision(Guid.NewGuid(), _tempRoot);
        return job;
    }

    private void AssertDir(string relativePath)
    {
        var full = Path.Combine(_tempRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Assert.True(Directory.Exists(full), $"Directory '{relativePath}' should exist");
    }
}
