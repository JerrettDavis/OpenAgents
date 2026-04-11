import type { ApiJobDetail } from '@/lib/types/api';
import { JobStateBadge, JobOutcomeBadge, ConnectionBadge } from '@/components/jobs/job-state-badge';
import { formatDateTime, formatElapsed } from '@/lib/utils/format';

interface SummaryCardProps {
  label: string;
  value: React.ReactNode;
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-[2px] border border-[color:var(--line)] bg-black/10 px-4 py-3">
      <span className="console-label">{label}</span>
      <div className="mt-2 text-sm text-[color:var(--foreground)]">{value}</div>
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
    <div className="rounded-[2px] border border-[color:var(--line)] bg-black/10 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="console-label">{label}</span>
        <span className="text-xs text-[color:var(--foreground-soft)]">
          {completed}/{total}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-[2px] bg-black/30">
        <div className="flex h-full">
          <div className="h-full bg-emerald-400 transition-all" style={{ width: `${pctDone}%` }} />
          <div
            className="h-full bg-[color:var(--accent)] transition-all"
            style={{ width: `${pctRunning}%` }}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-[color:var(--foreground-muted)]">
        {completed > 0 && <span className="text-emerald-300">{completed} done</span>}
        {running > 0 && <span className="text-[color:var(--accent)]">{running} running</span>}
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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
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
            <span className="break-all font-mono text-xs text-[color:var(--foreground-soft)]">
              {job.workspace_path}
            </span>
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
