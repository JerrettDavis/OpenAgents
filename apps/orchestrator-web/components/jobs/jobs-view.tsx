"use client";

import Link from "next/link";
import { useState } from "react";
import { useJobs } from "@/lib/hooks/use-jobs";
import { JobStateBadge, JobOutcomeBadge } from "@/components/jobs/job-state-badge";
import { CreateJobDialog } from "@/components/jobs/create-job-dialog";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatRelativeTime, formatElapsed, truncate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiJobState, ApiJobSummary } from "@/lib/types/api";

const STATE_FILTERS: Array<{ label: string; value: ApiJobState | "" }> = [
  { label: "All", value: "" },
  { label: "Running", value: "Running" },
  { label: "Pending", value: "Pending" },
  { label: "Queued", value: "Queued" },
  { label: "Completed", value: "Completed" },
  { label: "Error", value: "Error" },
  { label: "Archived", value: "Archived" },
];

export function JobsView() {
  const [stateFilter, setStateFilter] = useState<ApiJobState | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { jobs, loading, error, totalCount, refetch } = useJobs(
    stateFilter ? { state: stateFilter } : {}
  );

  return (
    <div className="flex flex-col gap-0">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-zinc-100">Jobs</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            {loading ? "Loading…" : `${totalCount} total`}
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <span aria-hidden>+</span> New Job
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 border-b border-zinc-800 px-6 py-2.5">
        {STATE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStateFilter(f.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              stateFilter === f.value
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <ErrorState
            title="Could not load jobs"
            message={error}
            onRetry={refetch}
          />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon="⬡"
            title="No jobs yet"
            description={
              stateFilter
                ? `No jobs with state "${stateFilter}".`
                : "Create your first job to start orchestrating agents."
            }
            action={
              !stateFilter ? (
                <button
                  onClick={() => setDialogOpen(true)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
                >
                  + New Job
                </button>
              ) : undefined
            }
          />
        ) : (
          <JobsTable jobs={jobs} />
        )}
      </div>

      <CreateJobDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => refetch()}
      />
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────

function JobsTable({ jobs }: { jobs: ApiJobSummary[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            <th className="px-4 py-2.5 text-left font-medium text-zinc-500">
              Title
            </th>
            <th className="px-4 py-2.5 text-left font-medium text-zinc-500">
              State
            </th>
            <th className="hidden px-4 py-2.5 text-left font-medium text-zinc-500 sm:table-cell">
              Workflow
            </th>
            <th className="hidden px-4 py-2.5 text-left font-medium text-zinc-500 md:table-cell">
              Provider
            </th>
            <th className="hidden px-4 py-2.5 text-left font-medium text-zinc-500 lg:table-cell">
              Duration
            </th>
            <th className="px-4 py-2.5 text-left font-medium text-zinc-500">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
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
    <tr className="bg-zinc-900/40 transition-colors hover:bg-zinc-900">
      <td className="px-4 py-3">
        <Link
          href={`/jobs/${job.id}`}
          className="group flex flex-col gap-0.5"
        >
          <span className="font-medium text-zinc-200 transition-colors group-hover:text-indigo-300">
            {truncate(job.title, 60)}
          </span>
          <span className="font-mono text-zinc-600">{job.id}</span>
        </Link>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <JobStateBadge state={job.state} />
          <JobOutcomeBadge outcome={job.outcome} />
        </div>
      </td>
      <td className="hidden px-4 py-3 text-zinc-400 sm:table-cell">
        {job.workflow_id}
      </td>
      <td className="hidden px-4 py-3 text-zinc-400 md:table-cell">
        {job.provider_id}
      </td>
      <td className="hidden px-4 py-3 text-zinc-500 lg:table-cell">
        {job.duration_ms != null
          ? formatElapsed(job.started_at_utc, job.finished_at_utc)
          : job.started_at_utc
            ? formatElapsed(job.started_at_utc)
            : "—"}
      </td>
      <td className="px-4 py-3 text-zinc-500">
        {formatRelativeTime(job.created_at_utc)}
      </td>
    </tr>
  );
}
