'use client';

import { useJobEvents } from '@/lib/hooks/use-job-events';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatRelativeTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { ApiEvent, ApiEventSeverity } from '@/lib/types/api';

// ── Severity → badge variant ──────────────────────────────────────────

const SEVERITY_VARIANT: Record<
  ApiEventSeverity,
  NonNullable<React.ComponentProps<typeof Badge>['variant']>
> = {
  info: 'info',
  warning: 'warning',
  error: 'error',
  critical: 'red',
};

const EVENT_TYPE_COLOR: Record<string, string> = {
  'job.': 'text-indigo-400',
  'stage.': 'text-blue-400',
  'task.': 'text-teal-400',
  'agent.': 'text-violet-400',
  'log.': 'text-zinc-500',
  heartbeat: 'text-zinc-600',
};

function eventTypeColor(type: string): string {
  for (const [prefix, cls] of Object.entries(EVENT_TYPE_COLOR)) {
    if (type.startsWith(prefix)) return cls;
  }
  return 'text-zinc-400';
}

// ── Single event row ──────────────────────────────────────────────────

function EventRow({ event }: { event: ApiEvent }) {
  return (
    <div className="grid grid-cols-[96px_12px_minmax(0,1fr)_auto] items-start gap-3 border-b border-[color:var(--line)] px-4 py-3 last:border-0 hover:bg-white/[0.03]">
      <time
        className="shrink-0 pt-0.5 text-xs text-[color:var(--foreground-muted)]"
        dateTime={event.occurred_at_utc}
        title={formatDateTime(event.occurred_at_utc)}
      >
        {formatRelativeTime(event.occurred_at_utc)}
      </time>

      <span
        className={cn(
          'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
          event.severity === 'error' || event.severity === 'critical'
            ? 'bg-red-500'
            : event.severity === 'warning'
              ? 'bg-amber-500'
              : 'bg-zinc-600'
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('font-mono text-xs font-medium', eventTypeColor(event.event_type))}>
            {event.event_type}
          </span>
          {event.severity !== 'info' && (
            <Badge variant={SEVERITY_VARIANT[event.severity]}>{event.severity}</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-[color:var(--foreground)]">{event.title}</p>
        {event.summary && event.summary !== event.title && (
          <p className="mt-1 text-xs leading-5 text-[color:var(--foreground-muted)]">
            {event.summary}
          </p>
        )}
      </div>

      <span
        className="shrink-0 cursor-pointer select-all rounded-[2px] border border-[color:var(--line)] px-2 py-1 text-[0.68rem] text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground-soft)]"
        title="Click to select event ID"
      >
        {event.event_id}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

interface EventsTimelineProps {
  jobId: string;
  /** SSE-pushed events (fed in from parent, newest-first) */
  liveEvents?: ApiEvent[];
}

export function EventsTimeline({ jobId, liveEvents = [] }: EventsTimelineProps) {
  const { events, loading, error, refetch, prependEvent } = useJobEvents(jobId);

  // Wire SSE-pushed events into the hook's dedup state
  // (called from parent via a ref in production; here we accept prop for simplicity)
  // NOTE: We expose prependEvent for the parent to call via ref in the detail view.

  const allEvents = liveEvents.length > 0 ? liveEvents : events;

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && events.length === 0) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  if (allEvents.length === 0) {
    return (
      <EmptyState
        title="No events yet"
        description="Events will appear here as the job progresses."
      />
    );
  }

  return (
    <div className="console-surface overflow-hidden rounded-[3px]">
      <div className="flex items-center justify-between border-b border-[color:var(--line)] bg-black/10 px-4 py-3">
        <div>
          <p className="console-kicker">Timeline</p>
          <p className="mt-1 text-xs text-[color:var(--foreground-muted)]">
            {allEvents.length} events
          </p>
        </div>
        <Badge variant="default">{liveEvents.length > 0 ? 'Live feed' : 'Snapshot'}</Badge>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        {allEvents.map((event) => (
          <EventRow key={event.event_id} event={event} />
        ))}
      </div>
    </div>
  );
}
