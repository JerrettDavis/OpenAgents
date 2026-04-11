'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useJobs } from '@/lib/hooks/use-jobs';
import { JobStateBadge, JobOutcomeBadge } from '@/components/jobs/job-state-badge';
import { CreateJobDialog } from '@/components/jobs/create-job-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { formatRelativeTime, formatElapsed, truncate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { ApiJobState, ApiJobSummary } from '@/lib/types/api';

const STATE_FILTERS: Array<{ label: string; value: ApiJobState | '' }> = [
  { label: 'All', value: '' },
  { label: 'Running', value: 'Running' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Queued', value: 'Queued' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Error', value: 'Error' },
  { label: 'Archived', value: 'Archived' },
];

export function JobsView() {
  const [stateFilter, setStateFilter] = useState<ApiJobState | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { jobs, loading, error, totalCount, refetch } = useJobs(
    stateFilter ? { state: stateFilter } : {}
  );
  const activeCount = jobs.filter((job) =>
    ['Queued', 'Provisioning', 'Connecting', 'Running', 'Stopping'].includes(job.state)
  ).length;
  const errorCount = jobs.filter((job) => job.state === 'Error').length;
  const completedCount = jobs.filter((job) => job.state === 'Completed').length;

  return (
    <div className="flex flex-col gap-3">
      <section className="console-surface-strong console-hairline overflow-hidden rounded-xl">
        <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5">
            <div>
              <p className="console-kicker">Run queue</p>
              <h1 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">Jobs</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--foreground-soft)]">
                Filter the queue, spot failures fast, and jump directly into the run that needs
                intervention.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">
                {loading ? 'Syncing queue' : `${totalCount} visible runs`}
              </Badge>
              <Badge variant="info" dot>
                {activeCount} active now
              </Badge>
              <Badge variant={errorCount > 0 ? 'error' : 'success'}>
                {errorCount > 0 ? `${errorCount} requiring attention` : 'No active failures'}
              </Badge>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
            <MetricCard
              label="Visible jobs"
              value={String(totalCount)}
              note="Current filter result"
            />
            <MetricCard
              label="In flight"
              value={String(activeCount)}
              note="Queued through stopping"
            />
            <MetricCard
              label="Completed"
              value={String(completedCount)}
              note="Finished successfully"
            />
          </div>
        </div>

        <div className="border-t border-[color:var(--line)] px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStateFilter(f.value)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition',
                    stateFilter === f.value
                      ? 'border-[color:color-mix(in_oklch,var(--accent)_38%,var(--line-strong))] bg-[color:color-mix(in_oklch,var(--accent)_18%,transparent)] text-[color:var(--foreground)]'
                      : 'border-[color:var(--line)] text-[color:var(--foreground-muted)] hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[color:color-mix(in_oklch,var(--accent)_38%,var(--line-strong))] bg-[color:color-mix(in_oklch,var(--accent)_18%,transparent)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-[color:color-mix(in_oklch,var(--accent)_24%,transparent)]"
            >
              <span aria-hidden>+</span> New Job
            </button>
          </div>
        </div>
      </section>

      <section className="console-surface overflow-hidden rounded-xl">
        {loading && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorState title="Could not load jobs" message={error} onRetry={refetch} />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon="⎔"
              title="No jobs in this lane"
              description={
                stateFilter
                  ? `No jobs with state "${stateFilter}" are currently visible.`
                  : 'Create your first job to start orchestrating providers.'
              }
              action={
                !stateFilter ? (
                  <button
                    onClick={() => setDialogOpen(true)}
                    className="rounded-md border border-[color:color-mix(in_oklch,var(--accent)_38%,var(--line-strong))] bg-[color:color-mix(in_oklch,var(--accent)_18%,transparent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground)] transition hover:bg-[color:color-mix(in_oklch,var(--accent)_24%,transparent)]"
                  >
                    + New Job
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <JobsTable jobs={jobs} />
        )}
      </section>

      <CreateJobDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => refetch()}
      />
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--line)] bg-black/10 px-4 py-3">
      <p className="console-label">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">{value}</p>
      <p className="mt-1 text-sm text-[color:var(--foreground-muted)]">{note}</p>
    </div>
  );
}

function JobsTable({ jobs }: { jobs: ApiJobSummary[] }) {
  return (
    <div className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-b border-[color:var(--line)] bg-black/10 text-left text-[11px] uppercase tracking-[0.08em] text-[color:var(--foreground-muted)]">
            <th className="px-4 py-3 font-medium">Run</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="hidden px-4 py-3 font-medium lg:table-cell">Workflow</th>
            <th className="hidden px-4 py-3 font-medium lg:table-cell">Provider</th>
            <th className="hidden px-4 py-3 font-medium xl:table-cell">Runtime</th>
            <th className="px-4 py-3 font-medium">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--line)]">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobRow({ job }: { job: ApiJobSummary }) {
  return (
    <tr className="bg-black/5 transition hover:bg-[color:color-mix(in_oklch,var(--surface-strong)_70%,transparent)]">
      <td className="px-4 py-3.5 align-top">
        <Link href={`/jobs/${job.id}`} className="group flex flex-col gap-2">
          <span className="font-medium text-[color:var(--foreground)] transition group-hover:text-[color:var(--accent)]">
            {truncate(job.title, 60)}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--foreground-muted)]">
            <span className="rounded-md border border-[color:var(--line)] bg-black/10 px-2.5 py-1 font-mono">
              {job.id}
            </span>
            <span className="rounded-md border border-[color:var(--line)] bg-black/10 px-2.5 py-1">
              {job.workflow_id}
            </span>
            <span className="rounded-md border border-[color:var(--line)] bg-black/10 px-2.5 py-1 lg:hidden">
              {job.provider_id}
            </span>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3.5 align-top">
        <div className="flex flex-wrap items-center gap-1.5">
          <JobStateBadge state={job.state} />
          <JobOutcomeBadge outcome={job.outcome} />
        </div>
      </td>
      <td className="hidden px-4 py-3.5 align-top text-[color:var(--foreground-soft)] lg:table-cell">
        {job.workflow_id}
      </td>
      <td className="hidden px-4 py-3.5 align-top text-[color:var(--foreground-soft)] lg:table-cell">
        {job.provider_id}
      </td>
      <td className="hidden px-4 py-3.5 align-top text-[color:var(--foreground-muted)] xl:table-cell">
        {job.duration_ms != null
          ? formatElapsed(job.started_at_utc, job.finished_at_utc)
          : job.started_at_utc
            ? formatElapsed(job.started_at_utc)
            : '—'}
      </td>
      <td className="px-4 py-3.5 align-top text-[color:var(--foreground-muted)]">
        {formatRelativeTime(job.created_at_utc)}
      </td>
    </tr>
  );
}
