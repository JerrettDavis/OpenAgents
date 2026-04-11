using OpenAgents.Domain.Aggregates.Jobs;

namespace OpenAgents.OrchestratorApi.Infrastructure;

/// <summary>
/// Provisions the filesystem workspace for a job according to the
/// Workspace Contract (docs/plans/WORKSPACE-CONTRACT.md).
/// </summary>
public interface IWorkspaceProvisioner
{
    /// <summary>
    /// Create all required directories and seed files for the job's workspace.
    /// </summary>
    /// <param name="job">The job being provisioned (used for job.json metadata).</param>
    /// <param name="workflowName">Human-readable workflow name for TODO.md.</param>
    /// <param name="ct">Cancellation token.</param>
    Task ProvisionAsync(Job job, string workflowName, CancellationToken ct = default);
}

/// <summary>
/// Filesystem-based workspace provisioner.
/// Creates the standard OpenAgents workspace structure under the job's
/// WorkspaceHostPath directory.
/// </summary>
public sealed class WorkspaceProvisioner : IWorkspaceProvisioner
{
    private readonly ILogger<WorkspaceProvisioner> _logger;

    public WorkspaceProvisioner(ILogger<WorkspaceProvisioner> logger) => _logger = logger;

    public async Task ProvisionAsync(Job job, string workflowName, CancellationToken ct = default)
    {
        var root = job.WorkspaceHostPath
            ?? throw new InvalidOperationException("Job.WorkspaceHostPath must be set before provisioning.");

        _logger.LogInformation("Provisioning workspace at {Root} for job {JobId}", root, job.Id);

        // ── 1. .agent-orch sub-directories ────────────────────
        var agentOrch = Path.Combine(root, ".agent-orch");
        CreateDirectories(
            agentOrch,
            Path.Combine(agentOrch, "events"),
            Path.Combine(agentOrch, "logs"),
            Path.Combine(agentOrch, "artifacts"),
            Path.Combine(agentOrch, "reports"),
            Path.Combine(agentOrch, "metrics"),
            Path.Combine(agentOrch, "stages"),
            Path.Combine(agentOrch, "tasks"),
            Path.Combine(agentOrch, "mailbox-index"));

        // ── 2. .mailbox sub-directories ───────────────────────
        var mailbox = Path.Combine(root, ".mailbox");
        CreateDirectories(
            mailbox,
            Path.Combine(mailbox, "inbox"),
            Path.Combine(mailbox, "outbox"),
            Path.Combine(mailbox, "drafts"),
            Path.Combine(mailbox, "sent"),
            Path.Combine(mailbox, "archived"));

        // ── 3. Metadata JSON files ────────────────────────────
        await WriteJobJsonAsync(job, agentOrch, ct);
        await WriteWorkflowJsonAsync(job, workflowName, agentOrch, ct);
        await WriteStateJsonAsync(job, agentOrch, ct);

        // ── 4. Initial TODO.md ────────────────────────────────
        await WriteTodoMdAsync(job, workflowName, root, ct);

        // ── 5. pending-notifications.md (mailbox polling) ─────
        await File.WriteAllTextAsync(
            Path.Combine(agentOrch, "mailbox-index", "pending-notifications.md"),
            "# Pending Notifications\n\n<!-- Orchestrator writes here; agents poll at stage/task boundaries -->\n",
            ct);

        _logger.LogInformation("Workspace provisioned successfully for job {JobId}", job.Id);
    }

    // ──────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────

    private static void CreateDirectories(params string[] paths)
    {
        foreach (var path in paths)
            Directory.CreateDirectory(path);
    }

    private static async Task WriteJobJsonAsync(Job job, string agentOrch, CancellationToken ct)
    {
        var content = $$"""
            {
              "job_id": "{{job.Id}}",
              "title": {{System.Text.Json.JsonSerializer.Serialize(job.Title)}},
              "description": {{System.Text.Json.JsonSerializer.Serialize(job.Description)}},
              "workflow_definition_id": "{{job.WorkflowDefinitionId}}",
              "workflow_slug": {{System.Text.Json.JsonSerializer.Serialize(job.WorkflowSlug)}},
              "workflow_version": {{System.Text.Json.JsonSerializer.Serialize(job.WorkflowVersion)}},
              "primary_provider_id": {{System.Text.Json.JsonSerializer.Serialize(job.PrimaryProviderId)}},
              "primary_model": {{System.Text.Json.JsonSerializer.Serialize(job.PrimaryModel)}},
              "workspace_host_path": {{System.Text.Json.JsonSerializer.Serialize(job.WorkspaceHostPath)}},
              "created_at_utc": "{{job.CreatedAtUtc:O}}"
            }
            """;
        await File.WriteAllTextAsync(Path.Combine(agentOrch, "job.json"), content, ct);
    }

    private static async Task WriteWorkflowJsonAsync(
        Job job, string workflowName, string agentOrch, CancellationToken ct)
    {
        var content = $$"""
            {
              "workflow_definition_id": "{{job.WorkflowDefinitionId}}",
              "workflow_slug": {{System.Text.Json.JsonSerializer.Serialize(job.WorkflowSlug)}},
              "workflow_version": {{System.Text.Json.JsonSerializer.Serialize(job.WorkflowVersion)}},
              "workflow_name": {{System.Text.Json.JsonSerializer.Serialize(workflowName)}},
              "primary_provider_id": {{System.Text.Json.JsonSerializer.Serialize(job.PrimaryProviderId)}}
            }
            """;
        await File.WriteAllTextAsync(Path.Combine(agentOrch, "workflow.json"), content, ct);
    }

    private static async Task WriteStateJsonAsync(Job job, string agentOrch, CancellationToken ct)
    {
        var content = $$"""
            {
              "job_id": "{{job.Id}}",
              "state": {{System.Text.Json.JsonSerializer.Serialize(job.State.ToString())}},
              "outcome": {{System.Text.Json.JsonSerializer.Serialize(job.Outcome.ToString())}},
              "current_stage_id": null,
              "current_task_id": null,
              "updated_at_utc": "{{DateTime.UtcNow:O}}"
            }
            """;
        await File.WriteAllTextAsync(Path.Combine(agentOrch, "state.json"), content, ct);
    }

    private static async Task WriteTodoMdAsync(
        Job job, string workflowName, string root, CancellationToken ct)
    {
        var content = $$"""
            # {{job.Title}}

            ## Metadata
            job_id: {{job.Id}}
            workflow: {{job.WorkflowSlug}}
            stage: setup

            ## Stages
            - [ ] setup: Environment Setup
            - [ ] plan: Planning
            - [ ] implement: Implementation
            - [ ] verify: Verification

            ## Tasks
            - [ ] task-001: Initialize workspace and review requirements
            - [ ] task-002: Create implementation plan
            - [ ] task-003: Execute implementation
            - [ ] task-004: Verify and test changes

            ## Decisions

            ## Notes
            - Workflow: {{workflowName}} v{{job.WorkflowVersion}}
            - Provider: {{job.PrimaryProviderId}}
            - Created: {{job.CreatedAtUtc:O}}
            """;
        await File.WriteAllTextAsync(Path.Combine(root, "TODO.md"), content, ct);
    }
}
