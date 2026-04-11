/**
 * Wire types for the Orchestrator REST + SSE API.
 * Snake_case exactly matches the API contract (docs/plans/API-CONTRACT.md).
 * These are used directly by the API client; do not import into UI unless
 * you also import the mapping helpers from lib/api/client.ts.
 */

// ── Pagination ──────────────────────────────────────────────────────

export interface ApiPagination {
  total: number;
  limit: number;
  has_more: boolean;
  next_cursor: string | null;
}

export interface ApiListResponse<T> {
  items: T[];
  pagination: ApiPagination;
}

// ── Errors ──────────────────────────────────────────────────────────

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    detail: string | null;
  };
}

// ── Job states / outcomes ────────────────────────────────────────────

export type ApiJobState =
  | 'Pending'
  | 'Queued'
  | 'Provisioning'
  | 'Connecting'
  | 'Running'
  | 'Paused'
  | 'Stopping'
  | 'Completed'
  | 'Error'
  | 'Archived';

export type ApiJobOutcome =
  | 'NotStarted'
  | 'CompletedSuccessfully'
  | 'CompletedAbnormally'
  | 'CompletedWithErrors'
  | 'PartiallyCompleted'
  | 'Incomplete'
  | 'Failed'
  | 'Invalid';

export type ApiConnectionStatus =
  | 'Unknown'
  | 'Connecting'
  | 'Connected'
  | 'Flakey'
  | 'Failing'
  | 'Failed'
  | 'Disconnected';

// ── Job (list item) ──────────────────────────────────────────────────

export interface ApiJobSummary {
  id: string;
  title: string;
  state: ApiJobState;
  outcome: ApiJobOutcome;
  workflow_id: string;
  provider_id: string;
  created_at_utc: string;
  started_at_utc: string | null;
  finished_at_utc: string | null;
  duration_ms: number | null;
}

// ── Job (detail — GET /jobs/:id) ─────────────────────────────────────

export interface ApiJobDetail extends ApiJobSummary {
  description?: string;
  connection_status: ApiConnectionStatus;
  workflow_version?: string;
  model?: string;
  workspace_path?: string;
  current_stage_id?: string | null;
  current_task_id?: string | null;
  queued_at_utc?: string | null;
  stage_summary?: {
    total: number;
    completed: number;
    running: number;
    not_started: number;
  };
  task_summary?: {
    total: number;
    completed: number;
    running: number;
    not_started: number;
  };
}

export interface ApiJobDetailResponse {
  job: ApiJobDetail;
}

export interface ApiJobCreateResponse {
  job: ApiJobDetail;
}

export interface ApiJobStateTransitionResponse {
  job_id: string;
  state: ApiJobState;
}

// ── Create job request ───────────────────────────────────────────────

export interface ApiCreateJobRequest {
  title: string;
  description?: string;
  workflow_id: string;
  workflow_version?: string;
  provider_id: string;
  model?: string;
  workspace_path: string;
  parameters?: Record<string, unknown>;
}

// ── Stage ────────────────────────────────────────────────────────────

export type ApiStageState = 'NotStarted' | 'Running' | 'Completed' | 'Failed' | 'Skipped';

export interface ApiStage {
  id: string;
  job_id: string;
  stage_definition_id: string;
  name: string;
  state: ApiStageState;
  outcome?: string | null;
  order: number;
  is_optional: boolean;
  is_skipped: boolean;
  current_iteration: number;
  max_iterations: number;
  started_at_utc: string | null;
  finished_at_utc: string | null;
}

// ── Task ─────────────────────────────────────────────────────────────

export type ApiTaskState = 'NotStarted' | 'Running' | 'Completed' | 'Failed' | 'Blocked';

export interface ApiTask {
  id: string;
  job_id: string;
  stage_id: string;
  title: string;
  description?: string;
  state: ApiTaskState;
  outcome?: string | null;
  source: string;
  todo_address?: string;
  current_iteration: number;
  max_iterations: number;
  started_at_utc: string | null;
  finished_at_utc: string | null;
}

// ── Agent ─────────────────────────────────────────────────────────────

export interface ApiAgent {
  id: string;
  job_id: string;
  name: string;
  state: string;
  connection_status: ApiConnectionStatus;
  provider_id: string;
  image_ref: string;
  container_id?: string;
  primary_model: string;
  current_model: string;
  current_stage_id?: string | null;
  current_task_id?: string | null;
  started_at_utc: string | null;
  last_heartbeat_at_utc: string | null;
}

// ── Event ─────────────────────────────────────────────────────────────

export type ApiEventSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ApiEvent {
  schema_version: string;
  event_id: string;
  event_type: string;
  occurred_at_utc: string;
  recorded_at_utc: string;
  source: { kind: string; instance_id: string };
  correlation: { job_id: string; [key: string]: string };
  severity: ApiEventSeverity;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
}

// ── Log line ──────────────────────────────────────────────────────────

export interface ApiLogLine {
  timestamp: string;
  agent_id: string;
  stream: 'stdout' | 'stderr';
  line: string;
}

// ── Workflow ──────────────────────────────────────────────────────────

export interface ApiWorkflow {
  id: string;
  slug: string;
  name: string;
  version: string;
  category: string;
  description?: string;
  is_enabled: boolean;
  provider_compatibility: Array<{
    provider_id: string;
    support: string;
  }>;
}

export interface ApiProvider {
  id: string;
  provider_id: string;
  name: string;
  version: string;
  docker_image: string;
  description?: string;
  support_level: string;
  is_enabled: boolean;
}

export interface ApiArtifact {
  id: string;
  job_id: string;
  path: string;
  name: string;
  size_bytes: number;
  last_modified_utc: string;
  is_directory: boolean;
  source: string;
}

// ── Health / System ───────────────────────────────────────────────────

export interface ApiHealth {
  status: string;
  version: string;
  uptime_seconds: number;
  docker_available: boolean;
  db_connected: boolean;
}

export interface ApiSystemInfo {
  version: string;
  providers_loaded: string[];
  workflows_loaded: string[];
  active_jobs: number;
  workspace_root: string;
}

// ── SSE event types ───────────────────────────────────────────────────

export type SseEventType =
  | 'job.queued'
  | 'job.provisioning_started'
  | 'job.started'
  | 'job.paused'
  | 'job.resumed'
  | 'job.stopping'
  | 'job.completed'
  | 'job.failed'
  | 'job.archived'
  | 'stage.started'
  | 'stage.completed'
  | 'stage.failed'
  | 'stage.skipped'
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'task.blocked'
  | 'agent.started'
  | 'agent.completed'
  | 'agent.failed'
  | 'agent.disconnected'
  | 'mailbox.message_delivered'
  | 'mailbox.message_read'
  | 'log.line'
  | 'heartbeat';

export interface SseHeartbeat {
  ts: string;
}
