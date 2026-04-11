# EVENT SCHEMAS

## 1. Overview

OpenAgents emits structured events to represent everything important that happens during orchestration, execution, collaboration, observation, and completion.

> **v1 Implementation Note**: Events in v1 use a **CRUD + append-only event log** model, not full event sourcing. Agent containers write JSON event files to `.agent-orch/events/`. The orchestrator watches that directory, ingests each file, and appends the event record to the database. State (jobs, stages, tasks, agents) is maintained via normal CRUD updates — it is **not** derived by replaying the event log. Full projection-based event sourcing is deferred to post-v1. The event log is retained for observability, timeline display, and debugging.

These event schemas power:

- Real-time dashboards
- Timeline views
- Log normalization
- Replay and recovery
- Metrics and analytics
- Auditing and debugging
- Integrations with external systems

The event model must be:

- Consistent across providers
- Rich enough for observability
- Stable enough for versioning
- Flexible enough for provider-specific extensions

---

## 2. Event Design Principles

1. Events are facts
   - An event describes something that happened, not a command.

2. Events are immutable
   - Once emitted, an event should never be changed.

3. Events are append-only
   - The event stream is a history, not a mutable state store.

4. State is derived
   - Current status is computed from state projections and snapshots, not by mutating old events.
   - **v1 note**: In v1, state is maintained directly via CRUD operations. The event log is authoritative for the timeline and audit trail, but the DB entity tables (jobs, stages, tasks) are the source of truth for current state. Projection-based state derivation is post-v1.

5. Correlation is required
   - Events must be traceable across jobs, stages, tasks, agents, mail, git, and providers.

6. Provider extensions are allowed
   - But the core envelope stays stable.

7. Human-meaningful summaries matter
   - Events should support both machines and operators.

---

## 3. Event Architecture

OpenAgents should distinguish between:

1. **Core domain events**
   - Durable events representing important business/runtime facts.

2. **Operational stream events**
   - High-volume runtime events for live dashboards, logs, and transports.

3. **Projection/timeline entries**
   - User-facing summaries derived from one or more events.

Not every stream event needs to become a first-class domain event, but every first-class domain event should be streamable.

**v1 event pipeline** (filesystem-based):

```
Agent container
  → writes <timestamp>-<type>-<id>.json to .agent-orch/events/
  → Orchestrator FileWatcher detects new file
  → Orchestrator ingests event, appends to DB event_log table
  → Orchestrator broadcasts event via SSE to all subscribed UI clients
```

Replay from event log and projection rebuilds are post-v1 features.

---

## 4. Canonical Event Envelope

All events must use a common envelope.

```json
{
  "schema_version": "1.0.0",
  "event_id": "evt_...",
  "event_type": "job.created",
  "occurred_at_utc": "2026-04-09T18:30:00Z",
  "recorded_at_utc": "2026-04-09T18:30:01Z",
  "source": {
    "kind": "orchestrator",
    "instance_id": "orch-01",
    "provider_id": null,
    "provider_version": null
  },
  "correlation": {
    "job_id": "job_123",
    "workflow_id": "planning",
    "workflow_version": "1.0.0",
    "stage_id": "stage_plan",
    "task_id": "task_define_requirements",
    "agent_id": "agent_planner_01",
    "workspace_id": "ws_01",
    "mail_message_id": null,
    "thread_id": null,
    "correlation_id": "corr_abc"
  },
  "severity": "info",
  "title": "Job created",
  "summary": "A planning job was created and queued.",
  "payload": {},
  "extensions": {}
}
```

---

## 5. Envelope Fields

### Required fields

- `schema_version`
- `event_id`
- `event_type`
- `occurred_at_utc`
- `recorded_at_utc`
- `source`
- `correlation`
- `severity`
- `title`
- `payload`

### Optional fields

- `summary`
- `extensions`

---

## 6. Source Object

```json
{
  "kind": "orchestrator | agent | provider | mailbox | git-monitor | workflow-engine | system",
  "instance_id": "string",
  "provider_id": "string or null",
  "provider_version": "string or null"
}
```

### Rules

- `kind` identifies where the event originated.
- `instance_id` is the emitting runtime or subsystem identity.
- Provider-specific emitters should set `provider_id` and `provider_version` when relevant.

---

## 7. Correlation Object

```json
{
  "job_id": "string or null",
  "workflow_id": "string or null",
  "workflow_version": "string or null",
  "stage_id": "string or null",
  "task_id": "string or null",
  "agent_id": "string or null",
  "workspace_id": "string or null",
  "mail_message_id": "string or null",
  "thread_id": "string or null",
  "correlation_id": "string or null"
}
```

### Rules

- `job_id` should be present for nearly all runtime events.
- `correlation_id` is used to link related actions across subsystems.
- `thread_id` is especially important for mailbox and review loops.
- `stage_id` and `task_id` should be set whenever the event is stage/task scoped.

---

## 8. Severity Levels

Supported severities:

- `trace`
- `debug`
- `info`
- `warning`
- `error`
- `critical`

### Usage guidance

- `trace`: verbose internal execution details
- `debug`: low-level diagnostic info
- `info`: normal user-meaningful events
- `warning`: degraded but not failed behavior
- `error`: failure occurred in a local scope
- `critical`: unrecoverable or security-relevant failure

---

## 9. Event Type Taxonomy

Event types should be namespaced and dot-delimited.

Top-level categories:

- `job.*`
- `workflow.*`
- `stage.*`
- `task.*`
- `agent.*`
- `provider.*`
- `container.*`
- `workspace.*`
- `git.*`
- `mailbox.*`
- `artifact.*`
- `report.*`
- `metrics.*`
- `loop.*`
- `connection.*`
- `system.*`
- `security.*`

---

## 10. Common Payload Fragments

To keep schemas consistent, several shared fragments should be reused.

### Actor Reference

```json
{
  "id": "string",
  "name": "string",
  "type": "agent | user | orchestrator | system | workflow"
}
```

### File Reference

```json
{
  "path": "/workspace/project/TODO.md",
  "artifact_id": "art_123",
  "content_type": "text/markdown"
}
```

### Model Reference

```json
{
  "provider_id": "claude-code",
  "model": "claude-sonnet-4",
  "role": "primary"
}
```

### Git Reference

```json
{
  "repository_root": "/workspace/project",
  "active_branch": "feature/openagents",
  "head_commit_sha": "abc123"
}
```

---

## 11. Job Events

## 11.1 job.created

Emitted when a job is created.

### Payload

```json
{
  "job": {
    "id": "job_123",
    "title": "Plan OpenAgents repo",
    "workflow_id": "planning",
    "workflow_version": "1.0.0",
    "primary_provider_id": "claude-code",
    "primary_model": "claude-sonnet-4"
  },
  "parameters_snapshot_artifact_id": "art_params_01"
}
```

## 11.2 job.queued

Emitted when a job enters the queue.

## 11.3 job.provisioning_started

Emitted when infrastructure/container setup begins.

## 11.4 job.started

Emitted when execution begins.

### Payload

```json
{
  "job_id": "job_123",
  "started_at_utc": "2026-04-09T18:35:00Z"
}
```

## 11.5 job.paused

## 11.6 job.resumed

## 11.7 job.stopping

## 11.8 job.completed

## 11.9 job.failed

## 11.10 job.archived

### job.completed payload

```json
{
  "job_id": "job_123",
  "outcome": "CompletedSuccessfully",
  "duration_ms": 123456,
  "report_id": "rpt_001",
  "exit_code": 0
}
```

### job.failed payload

```json
{
  "job_id": "job_123",
  "outcome": "Failed",
  "failure_type": "auth_error",
  "message": "Provider returned 401",
  "retryable": false,
  "exit_code": 1
}
```

---

## 12. Workflow Events

## 12.1 workflow.resolved

Emitted when a workflow definition/version is resolved for a job.

## 12.2 workflow.expanded

Emitted when stages/tasks are expanded into runtime instances.

### Payload

```json
{
  "workflow_id": "planning",
  "workflow_version": "1.0.0",
  "stage_count": 3,
  "initial_task_count": 5,
  "compatibility_support_level": "FirstClass"
}
```

## 12.3 workflow.validation_failed

Emitted when a workflow cannot be used for a requested job.

---

## 13. Stage Events

## 13.1 stage.created

## 13.2 stage.ready

## 13.3 stage.started

## 13.4 stage.waiting

## 13.5 stage.blocked

## 13.6 stage.completed

## 13.7 stage.skipped

## 13.8 stage.failed

### stage.started payload

```json
{
  "stage": {
    "id": "stage_plan",
    "name": "Planning",
    "order": 1,
    "max_iterations": 3,
    "current_iteration": 1
  },
  "assigned_agent_ids": ["agent_planner_01"]
}
```

### stage.completed payload

```json
{
  "stage_id": "stage_plan",
  "duration_ms": 45000,
  "completed_task_count": 4,
  "failed_task_count": 0,
  "gate_evaluation": {
    "passed": true,
    "details": []
  }
}
```

---

## 14. Task Events

## 14.1 task.created

## 14.2 task.generated

## 14.3 task.assigned

## 14.4 task.started

## 14.5 task.progressed

## 14.6 task.waiting

## 14.7 task.blocked

## 14.8 task.completed

## 14.9 task.failed

## 14.10 task.cancelled

### task.created payload

```json
{
  "task": {
    "id": "task_define_requirements",
    "title": "Define requirements",
    "source": "Seeded",
    "stage_id": "stage_plan",
    "max_iterations": 3
  },
  "todo_address": {
    "document": "/workspace/project/TODO.md",
    "section": "Tasks",
    "line_hint": 12
  }
}
```

### task.progressed payload

```json
{
  "task_id": "task_define_requirements",
  "message": "Requirements draft expanded with provider constraints.",
  "percent_complete": 60,
  "linked_artifact_ids": ["art_123"]
}
```

### task.completed payload

```json
{
  "task_id": "task_define_requirements",
  "duration_ms": 24000,
  "output_summary_artifact_id": "art_sum_001"
}
```

---

## 15. Agent Events

## 15.1 agent.provisioning_started

## 15.2 agent.started

## 15.3 agent.heartbeat

## 15.4 agent.activity_detected

## 15.5 agent.model_changed

## 15.6 agent.role_assigned

## 15.7 agent.waiting

## 15.8 agent.blocked

## 15.9 agent.completed

## 15.10 agent.failed

## 15.11 agent.disconnected

### agent.started payload

```json
{
  "agent": {
    "id": "agent_planner_01",
    "name": "Planner",
    "provider_id": "claude-code",
    "image_ref": "openagents/claude-code:latest",
    "container_name": "oa-job-123-planner"
  },
  "roles": ["planner", "researcher"],
  "model": {
    "provider_id": "claude-code",
    "model": "claude-sonnet-4",
    "role": "primary"
  }
}
```

### agent.heartbeat payload

```json
{
  "agent_id": "agent_planner_01",
  "heartbeat_at_utc": "2026-04-09T18:40:00Z",
  "current_stage_id": "stage_plan",
  "current_task_id": "task_define_requirements",
  "status": "Running"
}
```

### agent.model_changed payload

```json
{
  "agent_id": "agent_planner_01",
  "previous_model": "claude-sonnet-4",
  "new_model": "claude-opus-4",
  "reason": "Workflow policy escalated model for final review"
}
```

---

## 16. Provider Events

## 16.1 provider.session_started

## 16.2 provider.turn_recorded

## 16.3 provider.tool_invoked

## 16.4 provider.tool_completed

## 16.5 provider.metrics_extracted

## 16.6 provider.rate_limited

## 16.7 provider.auth_failed

## 16.8 provider.session_completed

### provider.turn_recorded payload

```json
{
  "turn": {
    "index": 14,
    "role": "assistant",
    "input_artifact_id": "art_prompt_14",
    "output_artifact_id": "art_response_14",
    "model": "claude-sonnet-4"
  }
}
```

### provider.tool_invoked payload

```json
{
  "tool": {
    "name": "bash",
    "category": "shell",
    "arguments_artifact_id": "art_tool_args_01"
  },
  "invocation_id": "toolinv_001"
}
```

### provider.tool_completed payload

```json
{
  "invocation_id": "toolinv_001",
  "success": true,
  "duration_ms": 1540,
  "output_artifact_id": "art_tool_out_01"
}
```

### provider.auth_failed payload

```json
{
  "provider_id": "claude-code",
  "message": "Authentication failed",
  "error_code": "401",
  "retryable": false
}
```

---

## 17. Container Events

## 17.1 container.created

## 17.2 container.started

## 17.3 container.health_changed

## 17.4 container.log_attached

## 17.5 container.stopped

## 17.6 container.removed

### container.health_changed payload

```json
{
  "container_name": "oa-job-123-planner",
  "previous_health": "healthy",
  "new_health": "unhealthy",
  "details": "No heartbeat detected in 60 seconds"
}
```

---

## 18. Workspace Events

## 18.1 workspace.bound

## 18.2 workspace.prepared

## 18.3 workspace.validation_failed

## 18.4 workspace.todo_updated

## 18.5 workspace.contract_violation_detected

### workspace.todo_updated payload

```json
{
  "workspace_id": "ws_01",
  "todo_artifact_id": "art_todo_09",
  "parsed_task_count": 12,
  "completed_task_count": 4,
  "active_stage_name": "Planning"
}
```

### workspace.contract_violation_detected payload

```json
{
  "workspace_id": "ws_01",
  "violation": "Required directory missing",
  "path": "/workspace/project/.agent-orch/events"
}
```

---

## 19. Git Events

## 19.1 git.branch_created

## 19.2 git.branch_switched

## 19.3 git.worktree_created

## 19.4 git.status_observed

## 19.5 git.commit_created

## 19.6 git.merge_requested

## 19.7 git.pull_request_opened

## 19.8 git.conflict_detected

### git.commit_created payload

```json
{
  "workspace_id": "ws_01",
  "commit": {
    "sha": "abc123",
    "message": "feat: scaffold OpenAgents architecture docs",
    "author": "OpenAgents Planner",
    "conventional_commit_type": "feat"
  },
  "git": {
    "repository_root": "/workspace/project",
    "active_branch": "feature/openagents",
    "head_commit_sha": "abc123"
  }
}
```

### git.status_observed payload

```json
{
  "workspace_id": "ws_01",
  "modified_files": ["PRD.md", "SYSTEM-ARCHITECTURE.md"],
  "untracked_files": ["DOMAIN-MODEL.md"],
  "ahead_by": 2,
  "behind_by": 0
}
```

---

## 20. Mailbox Events

## 20.1 mailbox.message_created

## 20.2 mailbox.message_queued

## 20.3 mailbox.message_delivered

## 20.4 mailbox.message_read

## 20.5 mailbox.message_archived

## 20.6 mailbox.delivery_failed

### mailbox.message_created payload

```json
{
  "mail_message": {
    "id": "msg_001",
    "subject": "Review Request",
    "type": "TaskUpdate",
    "from": "agent://planner",
    "to": ["agent://reviewer1"],
    "thread_id": "thread_001",
    "correlation_id": "corr_review_001"
  },
  "body_artifact_id": "art_mail_01"
}
```

### mailbox.message_read payload

```json
{
  "mail_message_id": "msg_001",
  "read_by": "agent://reviewer1",
  "read_at_utc": "2026-04-09T18:50:00Z",
  "emit_read_receipt": true
}
```

---

## 21. Artifact Events

## 21.1 artifact.created

## 21.2 artifact.indexed

## 21.3 artifact.linked

## 21.4 artifact.promoted

## 21.5 artifact.retention_marked

### artifact.created payload

```json
{
  "artifact": {
    "id": "art_001",
    "type": "Report",
    "name": "final-report.md",
    "content_type": "text/markdown",
    "storage_location": "/workspace/project/.agent-orch/reports/final-report.md",
    "size_bytes": 10240
  }
}
```

---

## 22. Report Events

## 22.1 report.draft_generated

## 22.2 report.generated

## 22.3 report.superseded

## 22.4 report.archived

### report.generated payload

```json
{
  "report": {
    "id": "rpt_001",
    "type": "FinalJobReport",
    "title": "OpenAgents Planning Report",
    "body_artifact_id": "art_report_01"
  }
}
```

---

## 23. Metrics Events

## 23.1 metrics.token_usage_captured

## 23.2 metrics.model_usage_captured

## 23.3 metrics.cache_usage_captured

## 23.4 metrics.billing_estimated

## 23.5 metrics.latency_captured

### metrics.token_usage_captured payload

```json
{
  "usage": {
    "model": "claude-sonnet-4",
    "input_tokens": 1200,
    "output_tokens": 800,
    "total_tokens": 2000,
    "prompt_cache_read_tokens": 400,
    "prompt_cache_write_tokens": 100,
    "model_cache_read_tokens": 0,
    "model_cache_write_tokens": 0,
    "estimated_cache_breaks": 1
  }
}
```

### metrics.billing_estimated payload

```json
{
  "estimate": {
    "currency": "USD",
    "estimated_cost": 0.42,
    "confidence_level": "Medium",
    "estimation_basis": "Published token pricing and captured token usage"
  }
}
```

---

## 24. Loop and Iteration Events

## 24.1 loop.job_iteration_started

## 24.2 loop.job_iteration_completed

## 24.3 loop.stage_iteration_started

## 24.4 loop.stage_iteration_completed

## 24.5 loop.task_iteration_started

## 24.6 loop.task_iteration_completed

## 24.7 loop.custom_iteration_incremented

## 24.8 loop.max_iterations_reached

### loop.max_iterations_reached payload

```json
{
  "scope": "Stage",
  "scope_key": "stage_plan",
  "current_value": 3,
  "maximum_value": 3,
  "resulting_action": "Stage failed"
}
```

---

## 25. Connection Events

## 25.1 connection.status_changed

## 25.2 connection.flakey_detected

## 25.3 connection.restored

## 25.4 connection.failed

### connection.status_changed payload

```json
{
  "target_type": "agent",
  "target_id": "agent_planner_01",
  "previous_status": "Connected",
  "new_status": "Flakey",
  "reason": "Heartbeat jitter exceeded threshold"
}
```

---

## 26. System and Security Events

## 26.1 system.warning_emitted

## 26.2 system.policy_violation_detected

## 26.3 system.retention_cleanup_started

## 26.4 system.retention_cleanup_completed

## 26.5 security.secret_redaction_applied

## 26.6 security.privileged_action_invoked

### security.privileged_action_invoked payload

```json
{
  "action": "docker_container_stop",
  "invoked_by": {
    "id": "orch-01",
    "name": "Orchestrator",
    "type": "orchestrator"
  },
  "target": "oa-job-123-planner"
}
```

---

## 27. Versioning Rules

### Schema versioning

- Every event carries `schema_version`.
- Additive changes should increment the minor version.
- Breaking field changes should increment the major version.

### Event type stability

- Event type names should be treated as public contracts once released.
- Avoid renaming event types unless introducing a new versioned schema family.

---

## 28. Extension Rules

Provider packs and advanced workflows may add provider-specific data in `extensions`.

Example:

```json
{
  "extensions": {
    "claude_code": {
      "session_id": "sess_123",
      "cache_hit_ratio": 0.42
    }
  }
}
```

### Rules

- `extensions` must never redefine core fields.
- Extension payloads should be namespaced by provider or subsystem.
- Core dashboards must not depend on extension-only fields.

---

## 29. Ordering and Delivery Semantics

### Ordering

- Ordering is best-effort globally.
- Ordering must be preserved per emitting source where practical.
- Consumers should sort primarily by `occurred_at_utc`, secondarily by `recorded_at_utc`.

### Delivery

- Streaming delivery may be at-least-once.
- Persisted event storage must deduplicate by `event_id`.

### Idempotency

- Handlers and projections must be idempotent.

---

## 30. Projection Guidance

Dashboards should not bind directly to raw event streams without projection.

Recommended projections:

- Job summary projection
- Job timeline projection
- Stage/task progress projection
- Agent activity projection
- Mailbox summary projection
- Git activity projection
- Metrics rollup projection

This keeps UI concerns stable even as internal event detail grows.

---

## 31. Retention Guidance

Not every event needs the same retention class.

Suggested classes:

- `CriticalAudit`: retain long term
- `Operational`: retain medium term
- `VerboseDebug`: retain short term

Retention class can be inferred from event type or assigned by policy.

---

## 32. Validation Rules

A valid event must:

- use a recognized envelope
- include a unique `event_id`
- include a valid `event_type`
- include timestamps in UTC
- include a valid severity
- include a payload object
- include correlation identifiers appropriate for its scope

Invalid events should be rejected from durable storage and routed to diagnostics.

---

## 33. Minimal Required Event Set for v1

If v1 needs a reduced set, the minimum should include:

- `job.created`
- `job.started`
- `job.completed`
- `job.failed`
- `workflow.expanded`
- `stage.started`
- `stage.completed`
- `task.created`
- `task.completed`
- `agent.started`
- `agent.heartbeat`
- `provider.turn_recorded`
- `provider.tool_invoked`
- `git.commit_created`
- `mailbox.message_delivered`
- `artifact.created`
- `report.generated`
- `metrics.token_usage_captured`
- `connection.status_changed`

---

## 34. Example End-to-End Event Chain

A simple planning task may emit:

1. `job.created`
2. `workflow.resolved`
3. `workflow.expanded`
4. `container.created`
5. `agent.started`
6. `job.started`
7. `stage.started`
8. `task.created`
9. `task.started`
10. `provider.turn_recorded`
11. `provider.tool_invoked`
12. `provider.tool_completed`
13. `workspace.todo_updated`
14. `artifact.created`
15. `task.completed`
16. `stage.completed`
17. `report.generated`
18. `metrics.token_usage_captured`
19. `job.completed`

---

## 35. Summary

The OpenAgents event model is the operational language of the platform.

It provides:

- a stable, shared envelope
- namespaced event types
- strong correlation across subsystems
- support for real-time UX and durable replay
- room for provider-specific richness without polluting the core model

If the workflow spec defines how work should happen, the event schemas define how the platform proves that it did.
