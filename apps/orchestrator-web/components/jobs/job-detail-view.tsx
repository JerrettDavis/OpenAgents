'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useJob } from '@/lib/hooks/use-job';
import { useJobSse } from '@/lib/hooks/use-job-sse';
import { jobsApi, ApiError } from '@/lib/api/client';
import { ACTIVE_JOB_STATES } from '@/lib/types/domain';
import { JobSummaryCards } from '@/components/jobs/job-summary-cards';
import { StagesTasksPanel } from '@/components/jobs/stages-tasks-panel';
import { LogsPanel } from '@/components/jobs/logs-panel';
import { EventsTimeline } from '@/components/jobs/events-timeline';
import { JobStateBadge, JobOutcomeBadge } from '@/components/jobs/job-state-badge';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { formatElapsed } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { ApiJobDetail, ApiLogLine, ApiEvent } from '@/lib/types/api';

// ── Tabs ──────────────────────────────────────────────────────────────

type TabId = 'overview' | 'stages' | 'timeline' | 'logs';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'stages', label: 'Stages & Tasks' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'logs', label: 'Logs' },
];

// ── Action buttons ────────────────────────────────────────────────────

function JobActions({ job, onRefresh }: { job: ApiJobDetail; onRefresh: () => void }) {
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const router = useRouter();

  async function doAction(name: string, fn: () => Promise<unknown>) {
    setActionPending(name);
    setActionError(null);
    try {
      await fn();
      onRefresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Action failed';
      setActionError(msg);
    } finally {
      setActionPending(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {actionError && <span className="text-xs text-red-400">{actionError}</span>}

      {job.state === 'Pending' && (
        <button
          disabled={!!actionPending}
          onClick={() => void doAction('start', () => jobsApi.start(job.id))}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
        >
          {actionPending === 'start' && <Spinner size="xs" />}▶ Start
        </button>
      )}

      {(job.state === 'Running' || job.state === 'Paused') && (
        <button
          disabled={!!actionPending}
          onClick={() => void doAction('stop', () => jobsApi.stop(job.id))}
          className="flex items-center gap-1.5 rounded-lg border border-red-800 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:border-red-600 hover:text-red-200 disabled:opacity-50"
        >
          {actionPending === 'stop' && <Spinner size="xs" />}■ Stop
        </button>
      )}

      {(job.state === 'Completed' || job.state === 'Error') && (
        <button
          disabled={!!actionPending}
          onClick={() => void doAction('archive', () => jobsApi.archive(job.id))}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-50"
        >
          {actionPending === 'archive' && <Spinner size="xs" />}
          Archive
        </button>
      )}

      {job.state === 'Archived' && (
        <button
          disabled={!!actionPending}
          onClick={() =>
            void doAction('delete', async () => {
              await jobsApi.delete(job.id);
              router.push('/jobs');
            })
          }
          className="flex items-center gap-1.5 rounded-lg border border-red-900 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:border-red-700 hover:text-red-300 disabled:opacity-50"
        >
          {actionPending === 'delete' && <Spinner size="xs" />}
          Delete
        </button>
      )}

      <button
        disabled={!!actionPending}
        onClick={onRefresh}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-50"
        title="Refresh job"
      >
        ↺
      </button>
    </div>
  );
}

// ── SSE connection badge ──────────────────────────────────────────────

function SseBadge({ state }: { state: 'connecting' | 'connected' | 'disconnected' | 'error' }) {
  if (state === 'connected') {
    return (
      <Badge variant="success" dot>
        Live
      </Badge>
    );
  }
  if (state === 'connecting') {
    return <Badge variant="info">Connecting…</Badge>;
  }
  return null; // Don't show badge for terminal jobs
}

// ── Main view ─────────────────────────────────────────────────────────

interface JobDetailViewProps {
  jobId: string;
}

export function JobDetailView({ jobId }: JobDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { job, loading, error, notFound, refetch, updateJob } = useJob(jobId);

  const isActive = job ? (ACTIVE_JOB_STATES as Set<string>).has(job.state) : false;

  // Live log lines accumulated via SSE
  const [liveLogLines, setLiveLogLines] = useState<ApiLogLine[]>([]);
  const appendLiveLine = useCallback((line: ApiLogLine) => {
    setLiveLogLines((prev) => [...prev, line]);
  }, []);

  // Live events accumulated via SSE
  const [liveEvents, setLiveEvents] = useState<ApiEvent[]>([]);
  const appendLiveEvent = useCallback((event: ApiEvent) => {
    // Extract events from SSE (event data is ApiEvent-shaped for non-log events)
    setLiveEvents((prev) => [event, ...prev]);
  }, []);

  // SSE connection — only for active jobs
  const { connectionState } = useJobSse(jobId, {
    enabled: isActive,
    onLogLine: appendLiveLine,
    onJobStateChange: updateJob,
    onEvent: (sseEvent) => {
      // Try to parse as ApiEvent for timeline
      if (
        typeof sseEvent.data === 'object' &&
        sseEvent.data !== null &&
        'event_id' in sseEvent.data
      ) {
        appendLiveEvent(sseEvent.data as ApiEvent);
      }
    },
  });

  // ── Loading state ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-sm text-zinc-400">
          Job <code className="font-mono text-zinc-300">{jobId}</code> not found.
        </p>
        <a
          href="/jobs"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        >
          ← Back to Jobs
        </a>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────

  if (error && !job) {
    return (
      <div className="p-8">
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  if (!job) return null;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0">
      {/* Job header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <a href="/jobs" className="text-xs text-zinc-600 hover:text-zinc-400">
                Jobs
              </a>
              <span className="text-zinc-700">›</span>
              <h1 className="text-sm font-semibold text-zinc-100 truncate">{job.title}</h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <JobStateBadge state={job.state} />
              <JobOutcomeBadge outcome={job.outcome} />
              {isActive && <SseBadge state={connectionState} />}
              <span className="font-mono text-xs text-zinc-600">{job.id}</span>
              {job.started_at_utc && (
                <span className="text-xs text-zinc-500">
                  {formatElapsed(job.started_at_utc, job.finished_at_utc ?? undefined)} elapsed
                </span>
              )}
            </div>
          </div>
          <JobActions job={job} onRefresh={refetch} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <JobSummaryCards job={job} />
      </div>

      {/* Tabs nav */}
      <div className="flex items-center gap-0 border-b border-zinc-800 px-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'border-b-2 px-3 py-3 text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'overview' && <OverviewTab job={job} />}
        {activeTab === 'stages' && <StagesTasksPanel jobId={jobId} />}
        {activeTab === 'timeline' && <EventsTimeline jobId={jobId} liveEvents={liveEvents} />}
        {activeTab === 'logs' && (
          <div className="h-[60vh] min-h-80">
            <LogsPanel jobId={jobId} liveLines={liveLogLines} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────

function OverviewTab({ job }: { job: ApiJobDetail }) {
  return (
    <div className="space-y-4">
      {job.description && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="mb-1 text-xs font-medium text-zinc-500">Description</p>
          <p className="text-sm text-zinc-300">{job.description}</p>
        </div>
      )}

      {/* Raw job metadata (useful for debugging) */}
      <details className="group overflow-hidden rounded-lg border border-zinc-800">
        <summary className="flex cursor-pointer items-center justify-between bg-zinc-900 px-4 py-3 text-xs font-medium text-zinc-500 hover:text-zinc-300">
          <span>Raw job metadata</span>
          <span className="transition-transform group-open:rotate-90">›</span>
        </summary>
        <pre className="max-h-80 overflow-auto bg-zinc-950 p-4 text-xs text-zinc-400">
          {JSON.stringify(job, null, 2)}
        </pre>
      </details>
    </div>
  );
}
