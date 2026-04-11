'use client';

import { useJobStages } from '@/lib/hooks/use-job-stages';
import { tasksApi } from '@/lib/api/client';
import { useEffect, useState, useCallback } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { formatElapsed } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { ApiStage, ApiTask, ApiStageState, ApiTaskState } from '@/lib/types/api';

// ── Stage state styling ───────────────────────────────────────────────

const STAGE_STATE_CLASS: Record<ApiStageState, string> = {
  NotStarted: 'text-zinc-600',
  Running: 'text-blue-400',
  Completed: 'text-emerald-400',
  Failed: 'text-red-400',
  Skipped: 'text-zinc-500',
};

const STAGE_DOT_CLASS: Record<ApiStageState, string> = {
  NotStarted: 'bg-zinc-700',
  Running: 'bg-blue-500 animate-pulse',
  Completed: 'bg-emerald-500',
  Failed: 'bg-red-500',
  Skipped: 'bg-zinc-600',
};

const TASK_STATE_VARIANT: Record<
  ApiTaskState,
  NonNullable<React.ComponentProps<typeof Badge>['variant']>
> = {
  NotStarted: 'muted',
  Running: 'blue',
  Completed: 'success',
  Failed: 'error',
  Blocked: 'warning',
};

// ── Tasks for a stage ────────────────────────────────────────────────

function StageTasks({ jobId, stageId }: { jobId: string; stageId: string }) {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await tasksApi.list(jobId, { stage_id: stageId });
      setTasks(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [jobId, stageId]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  if (loading)
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  if (error)
    return (
      <p className="px-4 py-2 text-xs text-red-400">
        {error} —{' '}
        <button onClick={() => void fetchTasks()} className="underline hover:no-underline">
          retry
        </button>
      </p>
    );
  if (tasks.length === 0)
    return <p className="px-4 py-2 text-xs text-zinc-600">No tasks for this stage.</p>;

  return (
    <ul className="divide-y divide-zinc-800/50">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-start gap-3 px-4 py-2.5">
          <Badge variant={TASK_STATE_VARIANT[task.state]} className="mt-0.5 shrink-0">
            {task.state}
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-200">{task.title}</p>
            {task.description && <p className="mt-0.5 text-xs text-zinc-500">{task.description}</p>}
            {task.current_iteration > 1 && (
              <p className="mt-0.5 text-xs text-zinc-600">
                Iteration {task.current_iteration}/{task.max_iterations}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs text-zinc-600">
            {task.started_at_utc
              ? formatElapsed(task.started_at_utc, task.finished_at_utc ?? undefined)
              : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Stage row (expandable) ────────────────────────────────────────────

function StageRow({ jobId, stage }: { jobId: string; stage: ApiStage }) {
  const [expanded, setExpanded] = useState(stage.state === 'Running' || stage.state === 'Failed');

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800/50',
          expanded ? 'bg-zinc-800/30' : 'bg-zinc-900'
        )}
      >
        {/* Live dot */}
        <span className={cn('h-2 w-2 shrink-0 rounded-full', STAGE_DOT_CLASS[stage.state])} />

        {/* Order badge */}
        <span className="w-5 shrink-0 text-center text-xs text-zinc-600">{stage.order}</span>

        {/* Name */}
        <span className={cn('flex-1 text-sm font-medium', STAGE_STATE_CLASS[stage.state])}>
          {stage.name}
        </span>

        {/* Meta */}
        {stage.current_iteration > 1 && (
          <span className="text-xs text-zinc-500">
            iter {stage.current_iteration}/{stage.max_iterations}
          </span>
        )}
        {stage.is_optional && (
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">optional</span>
        )}
        <span className="text-xs text-zinc-600">
          {stage.started_at_utc
            ? formatElapsed(stage.started_at_utc, stage.finished_at_utc ?? undefined)
            : ''}
        </span>

        {/* Expand chevron */}
        <span
          className={cn('shrink-0 text-zinc-600 transition-transform', expanded && 'rotate-90')}
        >
          ›
        </span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800">
          <StageTasks jobId={jobId} stageId={stage.id} />
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────

interface StagesTasksPanelProps {
  jobId: string;
}

export function StagesTasksPanel({ jobId }: StagesTasksPanelProps) {
  const { stages, loading, error, refetch } = useJobStages(jobId);

  if (loading)
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (stages.length === 0)
    return (
      <EmptyState
        title="No stages yet"
        description="Stages will appear once the job starts executing."
      />
    );

  return (
    <div className="space-y-2">
      {stages.map((stage) => (
        <StageRow key={stage.id} jobId={jobId} stage={stage} />
      ))}
    </div>
  );
}
