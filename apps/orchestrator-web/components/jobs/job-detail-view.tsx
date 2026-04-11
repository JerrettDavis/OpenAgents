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
    <div className="flex flex-wrap items-center gap-2">
      {actionError && <span className="text-xs text-red-400">{actionError}</span>}

      {job.state === 'Pending' && (
        <button
          disabled={!!actionPending}
          onClick={() => void doAction('start', () => jobsApi.start(job.id))}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-700 bg-emerald-950/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-100 transition hover:border-emerald-500 hover:bg-emerald-900/70 disabled:opacity-50"
        >
          {actionPending === 'start' && <Spinner size="xs" />}▶ Start
        </button>
      )}

      {(job.state === 'Running' || job.state === 'Paused') && (
        <button
          disabled={!!actionPending}
          onClick={() => void doAction('stop', () => jobsApi.stop(job.id))}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-red-100 transition hover:border-red-600 hover:bg-red-950/60 disabled:opacity-50"
        >
          {actionPending === 'stop' && <Spinner size="xs" />}■ Stop
        </button>
      )}

      {(job.state === 'Completed' || job.state === 'Error') && (
        <button
          disabled={!!actionPending}
          onClick={() => void doAction('archive', () => jobsApi.archive(job.id))}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[color:var(--line)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)] disabled:opacity-50"
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
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-900 bg-red-950/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-red-100 transition hover:border-red-700 hover:bg-red-950/50 disabled:opacity-50"
        >
          {actionPending === 'delete' && <Spinner size="xs" />}
          Delete
        </button>
      )}

      <button
        disabled={!!actionPending}
        onClick={onRefresh}
        className="min-h-10 rounded-md border border-[color:var(--line)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)] disabled:opacity-50"
        title="Refresh job"
      >
        ↺ Refresh
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

  function focusTab(id: TabId) {
    requestAnimationFrame(() => {
      const element = document.getElementById(`tab-${id}`);
      if (element instanceof HTMLButtonElement) {
        element.focus();
      }
    });
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const lastIndex = TABS.length - 1;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = lastIndex;

    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = TABS[nextIndex];
    if (!nextTab) return;
    setActiveTab(nextTab.id);
    focusTab(nextTab.id);
  }

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
    <div className="flex flex-col gap-3">
      <section className="console-surface-strong console-hairline overflow-hidden rounded-xl">
        <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--foreground-muted)]">
              <a href="/jobs" className="transition hover:text-[color:var(--foreground-soft)]">
                Jobs
              </a>
              <span>›</span>
              <span className="rounded-md border border-[color:var(--line)] px-2 py-1 font-mono">
                {job.id}
              </span>
              <span>›</span>
              <span className="truncate">{job.workflow_id}</span>
            </div>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="console-kicker">Run inspection</p>
                <h1 className="mt-2 truncate text-2xl font-semibold text-[color:var(--foreground)]">
                  {job.title}
                </h1>
                {job.description && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--foreground-soft)]">
                    {job.description}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <JobStateBadge state={job.state} />
              <JobOutcomeBadge outcome={job.outcome} />
              {isActive && <SseBadge state={connectionState} />}
              <Badge variant="default">{job.provider_id}</Badge>
              <Badge variant="default">{job.workflow_id}</Badge>
              {job.started_at_utc && (
                <span className="text-xs text-[color:var(--foreground-muted)]">
                  {formatElapsed(job.started_at_utc, job.finished_at_utc ?? undefined)} elapsed
                </span>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 lg:max-w-md">
            <div className="grid grid-cols-2 gap-2.5">
              <HeroDatum label="Connection" value={job.connection_status} />
              <HeroDatum label="Model" value={job.model || 'Auto'} />
              <HeroDatum label="Started" value={job.started_at_utc ? 'Active' : 'Pending'} />
              <HeroDatum
                label="Runtime"
                value={
                  job.started_at_utc ? formatElapsed(job.started_at_utc, job.finished_at_utc) : '—'
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <JobActions job={job} onRefresh={refetch} />
            </div>
          </div>
        </div>
      </section>

      <section className="console-surface overflow-hidden rounded-xl px-4 py-4">
        <JobSummaryCards job={job} />
      </section>

      <section className="console-surface overflow-hidden rounded-xl">
        <div className="border-b border-[color:var(--line)] px-4 py-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Job detail sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onKeyDown={(event) =>
                  handleTabKeyDown(
                    event,
                    TABS.findIndex((item) => item.id === tab.id)
                  )
                }
                className={cn(
                  'rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition',
                  activeTab === tab.id
                    ? 'border-[color:color-mix(in_oklch,var(--accent)_38%,var(--line-strong))] bg-[color:color-mix(in_oklch,var(--accent)_18%,transparent)] text-[color:var(--foreground)]'
                    : 'border-[color:var(--line)] text-[color:var(--foreground-muted)] hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="p-4"
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === 'overview' && <OverviewTab job={job} />}
          {activeTab === 'stages' && <StagesTasksPanel jobId={jobId} />}
          {activeTab === 'timeline' && <EventsTimeline jobId={jobId} liveEvents={liveEvents} />}
          {activeTab === 'logs' && (
            <div className="h-[60vh] min-h-80">
              <LogsPanel jobId={jobId} liveLines={liveLogLines} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────

function OverviewTab({ job }: { job: ApiJobDetail }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className="space-y-4">
        <div className="console-surface rounded-lg p-4">
          <p className="console-kicker">Request</p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--foreground-soft)]">
            {job.description || 'No additional request context was attached to this run.'}
          </p>
        </div>

        <details className="console-surface group overflow-hidden rounded-lg">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)] hover:text-[color:var(--foreground)]">
            <span>Raw job metadata</span>
            <span className="transition-transform group-open:rotate-90">›</span>
          </summary>
          <pre className="max-h-80 overflow-auto border-t border-[color:var(--line)] bg-[color:color-mix(in_oklch,var(--background-strong)_90%,transparent)] p-4 text-xs text-[color:var(--foreground-soft)]">
            {JSON.stringify(job, null, 2)}
          </pre>
        </details>
      </div>

      <div className="console-surface rounded-lg p-4">
        <p className="console-kicker">Run profile</p>
        <div className="mt-4 space-y-3">
          <OverviewDatum label="Workflow" value={job.workflow_id} />
          <OverviewDatum label="Workflow version" value={job.workflow_version || '—'} />
          <OverviewDatum label="Provider" value={job.provider_id} />
          <OverviewDatum label="Model" value={job.model || 'Auto'} />
          <OverviewDatum label="Workspace" value={job.workspace_path || '—'} mono />
          <OverviewDatum label="Current stage" value={job.current_stage_id || 'Waiting'} mono />
          <OverviewDatum label="Current task" value={job.current_task_id || 'Waiting'} mono />
        </div>
      </div>
    </div>
  );
}

function HeroDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--line)] bg-black/10 px-4 py-3">
      <p className="console-label">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}

function OverviewDatum({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--line)] bg-black/10 px-4 py-3">
      <p className="console-label">{label}</p>
      <p
        className={cn(
          'mt-1 text-sm text-[color:var(--foreground-soft)]',
          mono && 'font-mono text-xs break-all'
        )}
      >
        {value}
      </p>
    </div>
  );
}
