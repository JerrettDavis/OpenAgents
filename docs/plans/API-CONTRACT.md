# API CONTRACT

## 1. Overview

This document defines the **REST + SSE API surface** for the OpenAgents Orchestrator. It is the authoritative contract for the v1 implementation. Frontend developers, integration authors, and backend implementers must treat this as the source of truth for request/response shapes, status codes, and SSE event delivery.

---

## 2. v1 Constraints

| Constraint         | Value                                                              |
| ------------------ | ------------------------------------------------------------------ |
| Auth               | **None** — local/trusted environment only. No API keys, no tokens. |
| Realtime transport | **SSE (Server-Sent Events)** — WebSockets are post-v1.             |
| Base path          | `/api/v1`                                                          |
| Content type       | `application/json` for REST; `text/event-stream` for SSE           |
| Versioning         | URI path versioning (`/api/v1/`)                                   |
| Pagination         | Cursor-based via `after` + `limit` query params                    |
| Error format       | See §4                                                             |

---

## 3. Base URL

```
http://localhost:8080/api/v1
```

All paths below are relative to this base.

---

## 4. Error Schema

All error responses use this envelope. HTTP status codes follow standard semantics.

```json
{
  "error": {
    "code": "JOB_NOT_FOUND",
    "message": "No job with id 'job_abc123' exists.",
    "detail": null
  }
}
```

### Standard Error Codes

| HTTP | Code               | Meaning                                      |
| ---- | ------------------ | -------------------------------------------- |
| 400  | `VALIDATION_ERROR` | Request body or params failed validation     |
| 404  | `NOT_FOUND`        | Resource does not exist                      |
| 409  | `CONFLICT`         | State transition not valid for current state |
| 422  | `UNPROCESSABLE`    | Semantically invalid request                 |
| 500  | `INTERNAL_ERROR`   | Unexpected server error                      |

---

## 5. Pagination

List endpoints support cursor-based pagination.

### Query Parameters

| Param   | Type      | Default | Description                               |
| ------- | --------- | ------- | ----------------------------------------- |
| `limit` | `integer` | `50`    | Max items per page (max 200)              |
| `after` | `string`  | —       | Cursor from previous page's `next_cursor` |

### Paginated Response Envelope

```json
{
  "items": [...],
  "pagination": {
    "total": 142,
    "limit": 50,
    "has_more": true,
    "next_cursor": "cursor_opaque_string"
  }
}
```

---

## 6. Jobs API

### 6.1 Create Job

```
POST /jobs
```

**Request body**

```json
{
  "title": "Plan the OpenAgents repo",
  "description": "Optional context for this job.",
  "workflow_id": "planning",
  "workflow_version": "1.0.0",
  "provider_id": "claude-code",
  "model": "claude-sonnet-4-5",
  "workspace_path": "/workspace/openagents",
  "parameters": {
    "topic_list": ["API design", "data model"],
    "stage_enablement": {}
  }
}
```

**Required fields**: `title`, `workflow_id`, `provider_id`, `workspace_path`

**Response** `201 Created`

```json
{
  "job": {
    "id": "job_abc123",
    "title": "Plan the OpenAgents repo",
    "state": "Pending",
    "outcome": "NotStarted",
    "workflow_id": "planning",
    "workflow_version": "1.0.0",
    "provider_id": "claude-code",
    "model": "claude-sonnet-4-5",
    "workspace_path": "/workspace/openagents",
    "created_at_utc": "2026-01-01T12:00:00Z",
    "started_at_utc": null,
    "finished_at_utc": null
  }
}
```

---

### 6.2 List Jobs

```
GET /jobs
```

**Query parameters**

| Param     | Type      | Description                                                             |
| --------- | --------- | ----------------------------------------------------------------------- |
| `state`   | `string`  | Filter by state: `Pending`, `Running`, `Completed`, `Error`, `Archived` |
| `outcome` | `string`  | Filter by outcome                                                       |
| `limit`   | `integer` | Page size (default 50)                                                  |
| `after`   | `string`  | Pagination cursor                                                       |

**Response** `200 OK`

```json
{
  "items": [
    {
      "id": "job_abc123",
      "title": "Plan the OpenAgents repo",
      "state": "Running",
      "outcome": "NotStarted",
      "workflow_id": "planning",
      "provider_id": "claude-code",
      "created_at_utc": "2026-01-01T12:00:00Z",
      "started_at_utc": "2026-01-01T12:01:00Z",
      "finished_at_utc": null,
      "duration_ms": null
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "has_more": false,
    "next_cursor": null
  }
}
```

---

### 6.3 Get Job

```
GET /jobs/{jobId}
```

**Response** `200 OK` — full job object including current stage, task counts, and workspace binding.

```json
{
  "job": {
    "id": "job_abc123",
    "title": "Plan the OpenAgents repo",
    "description": "...",
    "state": "Running",
    "outcome": "NotStarted",
    "connection_status": "Connected",
    "workflow_id": "planning",
    "workflow_version": "1.0.0",
    "provider_id": "claude-code",
    "model": "claude-sonnet-4-5",
    "workspace_path": "/workspace/openagents",
    "current_stage_id": "stage_plan",
    "current_task_id": "task_001",
    "created_at_utc": "2026-01-01T12:00:00Z",
    "queued_at_utc": "2026-01-01T12:00:01Z",
    "started_at_utc": "2026-01-01T12:01:00Z",
    "finished_at_utc": null,
    "duration_ms": null,
    "stage_summary": {
      "total": 3,
      "completed": 0,
      "running": 1,
      "not_started": 2
    },
    "task_summary": {
      "total": 5,
      "completed": 1,
      "running": 1,
      "not_started": 3
    }
  }
}
```

---

### 6.4 Start Job

```
POST /jobs/{jobId}/start
```

Transitions job from `Pending` → `Queued`. Returns `409 Conflict` if the job is not in `Pending` state.

**Response** `200 OK`

```json
{ "job_id": "job_abc123", "state": "Queued" }
```

---

### 6.5 Stop Job

```
POST /jobs/{jobId}/stop
```

Transitions job from `Running`/`Paused` → `Stopping`. The orchestrator sends SIGTERM to the container and waits for exit.

**Response** `200 OK`

```json
{ "job_id": "job_abc123", "state": "Stopping" }
```

---

### 6.6 Archive Job

```
POST /jobs/{jobId}/archive
```

Transitions a terminal job (`Completed`/`Error`) → `Archived`.

**Response** `200 OK`

```json
{ "job_id": "job_abc123", "state": "Archived" }
```

---

### 6.7 Delete Job

```
DELETE /jobs/{jobId}
```

Permanently removes job and all associated records. Only allowed on `Archived` jobs.

**Response** `204 No Content`

---

## 7. Stages API

### 7.1 List Stages for Job

```
GET /jobs/{jobId}/stages
```

**Response** `200 OK`

```json
{
  "items": [
    {
      "id": "jsi_001",
      "job_id": "job_abc123",
      "stage_definition_id": "planning",
      "name": "Planning",
      "state": "Running",
      "outcome": null,
      "order": 1,
      "is_optional": false,
      "is_skipped": false,
      "current_iteration": 1,
      "max_iterations": 5,
      "started_at_utc": "2026-01-01T12:01:30Z",
      "finished_at_utc": null
    }
  ]
}
```

---

### 7.2 Get Stage

```
GET /jobs/{jobId}/stages/{stageId}
```

Returns full stage instance including gate evaluation snapshot.

---

## 8. Tasks API

### 8.1 List Tasks for Job

```
GET /jobs/{jobId}/tasks
```

**Query parameters**: `stage_id`, `state`, `limit`, `after`

**Response** `200 OK`

```json
{
  "items": [
    {
      "id": "jti_001",
      "job_id": "job_abc123",
      "stage_id": "jsi_001",
      "title": "Define requirements",
      "description": "...",
      "state": "Running",
      "outcome": null,
      "source": "Seeded",
      "todo_address": "task-001",
      "current_iteration": 1,
      "max_iterations": 3,
      "started_at_utc": "2026-01-01T12:02:00Z",
      "finished_at_utc": null
    }
  ],
  "pagination": { "total": 5, "limit": 50, "has_more": false, "next_cursor": null }
}
```

---

### 8.2 Get Task

```
GET /jobs/{jobId}/tasks/{taskId}
```

---

## 9. Agents API

### 9.1 List Agents for Job

```
GET /jobs/{jobId}/agents
```

**Response** `200 OK`

```json
{
  "items": [
    {
      "id": "agent_001",
      "job_id": "job_abc123",
      "name": "planner",
      "state": "Running",
      "connection_status": "Connected",
      "provider_id": "claude-code",
      "image_ref": "openagents/claude-code:latest",
      "container_id": "abc123def456",
      "primary_model": "claude-sonnet-4-5",
      "current_model": "claude-sonnet-4-5",
      "current_stage_id": "jsi_001",
      "current_task_id": "jti_001",
      "started_at_utc": "2026-01-01T12:01:00Z",
      "last_heartbeat_at_utc": "2026-01-01T12:05:30Z"
    }
  ]
}
```

---

### 9.2 Get Agent

```
GET /jobs/{jobId}/agents/{agentId}
```

---

## 10. Events API

### 10.1 List Events for Job

```
GET /jobs/{jobId}/events
```

Returns the append-only event log for the job (sourced from the event-log DB table).

**Query parameters**

| Param        | Type      | Description                                             |
| ------------ | --------- | ------------------------------------------------------- |
| `event_type` | `string`  | Filter: e.g. `job.*`, `stage.started`, `task.completed` |
| `severity`   | `string`  | Filter: `info`, `warning`, `error`, `critical`          |
| `since`      | `string`  | ISO timestamp — only events after this time             |
| `limit`      | `integer` | Default 100, max 500                                    |
| `after`      | `string`  | Cursor                                                  |

**Response** `200 OK`

```json
{
  "items": [
    {
      "schema_version": "1.0.0",
      "event_id": "evt_001",
      "event_type": "job.started",
      "occurred_at_utc": "2026-01-01T12:01:00Z",
      "recorded_at_utc": "2026-01-01T12:01:00Z",
      "source": { "kind": "orchestrator", "instance_id": "orch-01" },
      "correlation": { "job_id": "job_abc123" },
      "severity": "info",
      "title": "Job started",
      "summary": "Execution began for job job_abc123",
      "payload": { "job_id": "job_abc123", "started_at_utc": "2026-01-01T12:01:00Z" }
    }
  ],
  "pagination": { "total": 42, "limit": 100, "has_more": false, "next_cursor": null }
}
```

---

## 11. Logs API

### 11.1 Get Raw Logs for Job

```
GET /jobs/{jobId}/logs
```

Returns raw container log lines for the job.

**Query parameters**

| Param      | Type      | Description                     |
| ---------- | --------- | ------------------------------- |
| `agent_id` | `string`  | Filter to specific agent's logs |
| `since`    | `string`  | ISO timestamp                   |
| `limit`    | `integer` | Default 500, max 5000           |
| `after`    | `string`  | Cursor                          |

**Response** `200 OK`

```json
{
  "items": [
    {
      "timestamp": "2026-01-01T12:01:05Z",
      "agent_id": "agent_001",
      "stream": "stdout",
      "line": "Starting planning stage..."
    }
  ],
  "pagination": { "total": 1200, "limit": 500, "has_more": true, "next_cursor": "..." }
}
```

---

## 12. Workflows API

Read-only. Workflow definitions are loaded from disk at startup.

### 12.1 List Workflows

```
GET /workflows
```

**Response** `200 OK`

```json
{
  "items": [
    {
      "id": "planning",
      "name": "Planning Workflow",
      "version": "1.0.0",
      "category": "planning",
      "description": "...",
      "is_enabled": true,
      "provider_compatibility": [{ "provider_id": "claude-code", "support": "first_class" }]
    }
  ]
}
```

---

### 12.2 Get Workflow

```
GET /workflows/{workflowId}
```

---

### 12.3 Get Workflow Version

```
GET /workflows/{workflowId}/versions/{version}
```

---

## 13. SSE — Realtime Streams

All SSE endpoints use `text/event-stream` and follow the W3C SSE specification.

### Connection

```
GET /stream/jobs/{jobId}
```

Subscribes to the realtime event stream for a specific job. Returns a persistent `text/event-stream` response.

**Headers**

```
Accept: text/event-stream
Cache-Control: no-cache
```

---

### SSE Message Format

Each SSE message uses the standard `event` / `data` format.

```
event: job.started
data: {"schema_version":"1.0.0","event_id":"evt_001","event_type":"job.started",...}

event: stage.started
data: {"schema_version":"1.0.0","event_id":"evt_002","event_type":"stage.started",...}

event: log.line
data: {"timestamp":"2026-01-01T12:01:05Z","agent_id":"agent_001","stream":"stdout","line":"..."}

event: heartbeat
data: {"ts":"2026-01-01T12:01:10Z"}
```

---

### SSE Event Types

| SSE `event` field           | Description                       |
| --------------------------- | --------------------------------- |
| `job.queued`                | Job accepted for execution        |
| `job.provisioning_started`  | Container creation started        |
| `job.started`               | Execution began                   |
| `job.paused`                | Job paused                        |
| `job.resumed`               | Job resumed                       |
| `job.stopping`              | Graceful shutdown initiated       |
| `job.completed`             | Job finished successfully         |
| `job.failed`                | Job finished with failure         |
| `job.archived`              | Job archived                      |
| `stage.started`             | Stage execution began             |
| `stage.completed`           | Stage completed                   |
| `stage.failed`              | Stage failed                      |
| `stage.skipped`             | Optional stage skipped            |
| `task.started`              | Task execution began              |
| `task.completed`            | Task completed                    |
| `task.failed`               | Task failed                       |
| `task.blocked`              | Task blocked                      |
| `agent.started`             | Agent container running           |
| `agent.completed`           | Agent finished                    |
| `agent.failed`              | Agent failed                      |
| `agent.disconnected`        | Agent container lost              |
| `mailbox.message_delivered` | Message delivered to inbox        |
| `mailbox.message_read`      | Message read                      |
| `log.line`                  | Raw log line from agent container |
| `heartbeat`                 | Keep-alive every 15 seconds       |

---

### Global Stream

```
GET /stream/system
```

System-level stream: job creation, completion, failure events across all jobs. Useful for the global dashboard view.

---

### Reconnection

Clients must implement automatic reconnection using the `Last-Event-ID` header. The orchestrator supports replaying events from a given ID for up to 5 minutes after disconnection.

```
GET /stream/jobs/{jobId}
Last-Event-ID: evt_042
```

The orchestrator will replay all events with IDs after `evt_042` before resuming live delivery.

---

## 14. System API

### 14.1 Health Check

```
GET /health
```

**Response** `200 OK`

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime_seconds": 3600,
  "docker_available": true,
  "db_connected": true
}
```

---

### 14.2 System Info

```
GET /system/info
```

**Response** `200 OK`

```json
{
  "version": "0.1.0",
  "providers_loaded": ["claude-code"],
  "workflows_loaded": ["planning"],
  "active_jobs": 2,
  "workspace_root": "/workspace"
}
```

---

## 15. Artifacts API

### 15.1 List Artifacts for Job

```
GET /jobs/{jobId}/artifacts
```

**Response** `200 OK`

```json
{
  "items": [
    {
      "id": "art_001",
      "job_id": "job_abc123",
      "name": "final-report.md",
      "type": "report",
      "content_type": "text/markdown",
      "path": "/workspace/openagents/.agent-orch/reports/final-report.md",
      "size_bytes": 4096,
      "created_at_utc": "2026-01-01T13:00:00Z"
    }
  ]
}
```

---

### 15.2 Download Artifact

```
GET /jobs/{jobId}/artifacts/{artifactId}/download
```

Returns the artifact file content with appropriate `Content-Type`.

---

## 16. Implementation Notes

### Route Registration Order (ASP.NET Core Minimal APIs)

Register in this order to avoid conflicts:

1. Health/system routes
2. SSE stream routes (long-lived — must be registered before middleware that buffers responses)
3. Job CRUD routes
4. Sub-resource routes (stages, tasks, agents, events, logs, artifacts)
5. Workflow routes

### SSE Implementation (ASP.NET Core)

- Use `Response.Headers["Content-Type"] = "text/event-stream"` with `Response.Headers["Cache-Control"] = "no-cache"`.
- Do **not** buffer the response — use `Response.BodyWriter` directly.
- Register clients in an in-memory `ConcurrentDictionary<string, Channel<SseEvent>>` keyed by `jobId`.
- When the orchestrator ingests a new event from `.agent-orch/events/`, it publishes to all matching channels.
- Send a `heartbeat` event every 15 seconds to prevent client-side connection timeouts.
- Remove client channel on `HttpContext.RequestAborted`.

### CORS

v1 is localhost-only. Allow `http://localhost:3000` (Next.js dev) and `http://localhost:8080` explicitly. Wildcard origins are acceptable for v1 given the local/trusted posture.

### Response Compression

Apply `gzip` compression to JSON responses. Do **not** compress SSE streams.
