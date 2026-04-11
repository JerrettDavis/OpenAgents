/**
 * Core domain types shared across the frontend.
 *
 * Re-exports and re-names the API wire types (lib/types/api.ts) into
 * the stable domain vocabulary used throughout the UI layer.  The API
 * types are authoritative; update api.ts first, then alias here.
 */

// Re-export everything from the authoritative API types so import paths
// inside components can use either file without duplication.
export type {
  ApiJobState as JobState,
  ApiJobOutcome as JobOutcome,
  ApiConnectionStatus as ConnectionStatus,
  ApiJobSummary as JobSummary,
  ApiJobDetail as Job,
  ApiJobDetailResponse,
  ApiJobCreateResponse,
  ApiJobStateTransitionResponse,
  ApiCreateJobRequest as CreateJobRequest,
  ApiStageState as StageState,
  ApiStage as Stage,
  ApiTaskState as TaskState,
  ApiTask as Task,
  ApiAgent as Agent,
  ApiEventSeverity as EventSeverity,
  ApiEvent as OrchestratorEvent,
  ApiLogLine as LogLine,
  ApiWorkflow as Workflow,
  ApiHealth as Health,
  ApiSystemInfo as SystemInfo,
  ApiPagination as Pagination,
  ApiListResponse as ListResponse,
  SseEventType,
  SseHeartbeat,
} from './api';

// ── Convenience union: states considered "active" (need polling / SSE) ──

export const ACTIVE_JOB_STATES = new Set([
  'Pending',
  'Queued',
  'Provisioning',
  'Connecting',
  'Running',
  'Paused',
  'Stopping',
] as const);

// ── UI-only helpers ──────────────────────────────────────────────────

/** Slim request shape used by the create-job form */
export interface CreateJobFormValues {
  title: string;
  description: string;
  workflow_id: string;
  provider_id: string;
  model: string;
  workspace_path: string;
}
