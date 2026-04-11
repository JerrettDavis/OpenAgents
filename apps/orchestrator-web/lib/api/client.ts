/**
 * Typed API client for the Orchestrator API v1.
 *
 * Base URL: NEXT_PUBLIC_API_URL (default http://localhost:8080)
 * All paths are relative to /api/v1 as per the API contract.
 *
 * Error handling:
 *   - Non-2xx responses throw an ApiError with the parsed error body
 *   - Network failures throw the underlying fetch error
 *   - 404 on job GET will throw with code NOT_FOUND — handle at call-site
 */

import type {
  ApiCreateJobRequest,
  ApiEvent,
  ApiHealth,
  ApiJobCreateResponse,
  ApiJobDetail,
  ApiJobDetailResponse,
  ApiJobStateTransitionResponse,
  ApiJobSummary,
  ApiListResponse,
  ApiLogLine,
  ApiStage,
  ApiSystemInfo,
  ApiTask,
  ApiWorkflow,
  ApiProvider,
  ApiArtifact,
} from '@/lib/types/api';

// ── Config ───────────────────────────────────────────────────────────

const SERVER_ROOT = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

const API_V1 = `${SERVER_ROOT}/api/v1`;

// ── Custom error type ─────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly detail: string | null = null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_V1}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    let code = 'INTERNAL_ERROR';
    let message = `${init?.method ?? 'GET'} ${path} → ${res.status}`;
    let detail: string | null = null;

    try {
      const body = (await res.json()) as {
        error?: { code?: string; message?: string; detail?: string | null };
      };
      if (body?.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
        detail = body.error.detail ?? null;
      }
    } catch {
      // body was not JSON — fall back to text for debugging
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
    }

    throw new ApiError(res.status, code, message, detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ── Jobs ──────────────────────────────────────────────────────────────

export interface ListJobsParams {
  state?: string;
  outcome?: string;
  limit?: number;
  after?: string;
}

export const jobsApi = {
  list: (params: ListJobsParams = {}) => {
    const qs = new URLSearchParams();
    if (params.state) qs.set('state', params.state);
    if (params.outcome) qs.set('outcome', params.outcome);
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.after) qs.set('after', params.after);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<ApiListResponse<ApiJobSummary>>(`/jobs${query}`);
  },

  get: (id: string) => apiFetch<ApiJobDetailResponse>(`/jobs/${id}`).then((r) => r.job),

  create: (body: ApiCreateJobRequest) =>
    apiFetch<ApiJobCreateResponse>('/jobs', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((r) => r.job),

  start: (id: string) =>
    apiFetch<ApiJobStateTransitionResponse>(`/jobs/${id}/start`, {
      method: 'POST',
    }),

  stop: (id: string) =>
    apiFetch<ApiJobStateTransitionResponse>(`/jobs/${id}/stop`, {
      method: 'POST',
    }),

  archive: (id: string) =>
    apiFetch<ApiJobStateTransitionResponse>(`/jobs/${id}/archive`, {
      method: 'POST',
    }),

  delete: (id: string) => apiFetch<void>(`/jobs/${id}`, { method: 'DELETE' }),
};

// ── Stages ────────────────────────────────────────────────────────────

export const stagesApi = {
  list: (jobId: string) => apiFetch<ApiListResponse<ApiStage>>(`/jobs/${jobId}/stages`),

  get: (jobId: string, stageId: string) =>
    apiFetch<{ stage: ApiStage }>(`/jobs/${jobId}/stages/${stageId}`).then((r) => r.stage),
};

// ── Tasks ─────────────────────────────────────────────────────────────

export interface ListTasksParams {
  stage_id?: string;
  state?: string;
  limit?: number;
  after?: string;
}

export const tasksApi = {
  list: (jobId: string, params: ListTasksParams = {}) => {
    const qs = new URLSearchParams();
    if (params.stage_id) qs.set('stage_id', params.stage_id);
    if (params.state) qs.set('state', params.state);
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.after) qs.set('after', params.after);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<ApiListResponse<ApiTask>>(`/jobs/${jobId}/tasks${query}`);
  },
};

// ── Events ────────────────────────────────────────────────────────────

export interface ListEventsParams {
  event_type?: string;
  severity?: string;
  since?: string;
  limit?: number;
  after?: string;
}

export const eventsApi = {
  list: (jobId: string, params: ListEventsParams = {}) => {
    const qs = new URLSearchParams();
    if (params.event_type) qs.set('event_type', params.event_type);
    if (params.severity) qs.set('severity', params.severity);
    if (params.since) qs.set('since', params.since);
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.after) qs.set('after', params.after);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<ApiListResponse<ApiEvent>>(`/jobs/${jobId}/events${query}`);
  },
};

// ── Logs ──────────────────────────────────────────────────────────────

export interface ListLogsParams {
  agent_id?: string;
  since?: string;
  limit?: number;
  after?: string;
}

export const logsApi = {
  list: (jobId: string, params: ListLogsParams = {}) => {
    const qs = new URLSearchParams();
    if (params.agent_id) qs.set('agent_id', params.agent_id);
    if (params.since) qs.set('since', params.since);
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.after) qs.set('after', params.after);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<ApiListResponse<ApiLogLine>>(`/jobs/${jobId}/logs${query}`);
  },
};

// ── Workflows ─────────────────────────────────────────────────────────

export const workflowsApi = {
  list: () => apiFetch<{ items: ApiWorkflow[] }>('/workflows?include_disabled=true'),
  get: (id: string) =>
    apiFetch<{ workflow: ApiWorkflow }>(`/workflows/${id}`).then((r) => r.workflow),
  create: (payload: {
    name: string;
    slug: string;
    version: string;
    description?: string;
    category?: string;
    is_experimental?: boolean;
    is_enabled?: boolean;
  }) =>
    apiFetch<{ workflow: ApiWorkflow }>('/workflows', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (
    idOrSlug: string,
    payload: {
      name?: string;
      version?: string;
      description?: string;
      category?: string;
      is_experimental?: boolean;
      is_enabled?: boolean;
    }
  ) =>
    apiFetch<{ workflow: ApiWorkflow }>(`/workflows/${idOrSlug}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

export const providersApi = {
  list: () =>
    apiFetch<{ items?: ApiProvider[] } | ApiProvider[]>('/providers?include_disabled=true'),
  get: (providerId: string) =>
    apiFetch<{ provider: ApiProvider }>(`/providers/${providerId}`).then((r) => r.provider),
  create: (payload: {
    provider_id: string;
    name: string;
    version: string;
    docker_image: string;
    description?: string;
    support_level?: string;
    is_enabled?: boolean;
  }) =>
    apiFetch<{ provider: ApiProvider }>('/providers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (
    providerId: string,
    payload: {
      name?: string;
      version?: string;
      docker_image?: string;
      description?: string;
      support_level?: string;
      is_enabled?: boolean;
    }
  ) =>
    apiFetch<{ provider: ApiProvider }>(`/providers/${providerId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

export const artifactsApi = {
  list: (jobId: string, path?: string) => {
    const qs = new URLSearchParams();
    if (path) qs.set('path', path);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<ApiListResponse<ApiArtifact>>(`/jobs/${jobId}/artifacts${query}`);
  },
};

// ── System / Health ───────────────────────────────────────────────────

export const systemApi = {
  health: () => apiFetch<ApiHealth>('/health'),
  info: () => apiFetch<ApiSystemInfo>('/system/info'),
};

// ── SSE URL helper ────────────────────────────────────────────────────

/** Returns the full SSE URL for a job stream. Client-only (EventSource). */
export function jobSseUrl(jobId: string): string {
  return `${API_V1}/stream/jobs/${jobId}`;
}

/** Returns the full SSE URL for the global system stream. */
export function systemSseUrl(): string {
  return `${API_V1}/stream/system`;
}

// ── Re-export types callers commonly need ─────────────────────────────

export type { ApiJobDetail as JobDetail, ApiJobSummary as JobSummary };
