import type { ApiJobDetail } from '@/lib/types/api';
import { JobStateBadge, JobOutcomeBadge, ConnectionBadge } from '@/components/jobs/job-state-badge';
import { formatDateTime, formatElapsed } from '@/lib/utils/format';

interface SummaryCardProps {
  label: string;
  value: React.ReactNode;
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <div className="text-sm text-zinc-200">{value}</div>
    </div>
  );
}

interface CountBarProps {
  label: string;
  completed: number;
  running: number;
  notStarted: number;
  total: number;
}

function CountBar({ label, completed, running, notStarted, total }: CountBarProps) {
  if (total === 0) return null;
  const pctDone = (completed / total) * 100;
  const pctRunning = (running / total) * 100;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <span className="text-xs text-zinc-400">
          {completed}/{total}
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="flex h-full">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pctDone}%` }} />
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${pctRunning}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        {completed > 0 && <span className="text-emerald-500">{completed} done</span>}
        {running > 0 && <span className="text-blue-400">{running} running</span>}
        {notStarted > 0 && <span>{notStarted} pending</span>}
      </div>
    </div>
  );
}

interface JobSummaryCardsProps {
  job: ApiJobDetail;
}

export function JobSummaryCards({ job }: JobSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <SummaryCard
        label="State"
        value={
          <div className="flex flex-wrap items-center gap-1.5">
            <JobStateBadge state={job.state} />
            <JobOutcomeBadge outcome={job.outcome} />
          </div>
        }
      />
      <SummaryCard label="Connection" value={<ConnectionBadge status={job.connection_status} />} />
      <SummaryCard label="Workflow" value={job.workflow_id} />
      <SummaryCard label="Provider" value={job.provider_id} />
      {job.model && <SummaryCard label="Model" value={job.model} />}
      <SummaryCard label="Started" value={formatDateTime(job.started_at_utc) || '—'} />
      <SummaryCard
        label="Duration"
        value={job.started_at_utc ? formatElapsed(job.started_at_utc, job.finished_at_utc) : '—'}
      />
      {job.workspace_path && (
        <SummaryCard
          label="Workspace"
          value={
            <span className="break-all font-mono text-xs text-zinc-400">{job.workspace_path}</span>
          }
        />
      )}
      {job.stage_summary && job.stage_summary.total > 0 && (
        <CountBar
          label="Stages"
          completed={job.stage_summary.completed}
          running={job.stage_summary.running}
          notStarted={job.stage_summary.not_started}
          total={job.stage_summary.total}
        />
      )}
      {job.task_summary && job.task_summary.total > 0 && (
        <CountBar
          label="Tasks"
          completed={job.task_summary.completed}
          running={job.task_summary.running}
          notStarted={job.task_summary.not_started}
          total={job.task_summary.total}
        />
      )}
    </div>
  );
}
