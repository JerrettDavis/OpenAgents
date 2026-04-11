'use client';

import { useEffect, useRef } from 'react';
import { useJobLogs } from '@/lib/hooks/use-job-logs';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { formatLogTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { ApiLogLine } from '@/lib/types/api';

interface LogsPanelProps {
  jobId: string;
  /** Live log lines appended via SSE (fed in from parent) */
  liveLines?: ApiLogLine[];
}

export function LogsPanel({ jobId, liveLines = [] }: LogsPanelProps) {
  const { lines: restLines, loading, error, refetch } = useJobLogs(jobId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Merge REST + SSE lines, deduplicate by timestamp+line
  const allLines = mergeLogLines(restLines, liveLines);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allLines.length]);

  if (loading && restLines.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  if (error && restLines.length === 0) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  if (allLines.length === 0) {
    return (
      <EmptyState
        icon="▶"
        title="No logs yet"
        description="Log output will appear here once the job starts."
      />
    );
  }

  return (
    <div className="console-surface flex h-full flex-col overflow-hidden rounded-lg">
      <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--line)] bg-black/10 px-4 py-2.5">
        <div>
          <p className="console-kicker">Execution log</p>
          <p className="mt-1 text-xs text-[color:var(--foreground-muted)]">
            {allLines.length} lines
          </p>
        </div>
        <button
          onClick={refetch}
          className="rounded-md border border-[color:var(--line)] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-soft)] transition hover:border-[color:var(--line-strong)] hover:text-[color:var(--foreground)]"
        >
          ↺ Reload
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[color:color-mix(in_oklch,var(--background-strong)_90%,transparent)] p-4 font-mono text-xs leading-6">
        {allLines.map((line, i) => (
          <LogLine key={`${line.timestamp}-${i}`} line={line} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function LogLine({ line }: { line: ApiLogLine }) {
  return (
    <div className="grid grid-cols-[78px_128px_minmax(0,1fr)] gap-3 rounded-xl px-2 py-1.5 hover:bg-white/[0.03]">
      <span className="shrink-0 select-none text-[color:var(--foreground-muted)]">
        {formatLogTime(line.timestamp)}
      </span>
      <span className="truncate text-[color:color-mix(in_oklch,var(--foreground-muted)_86%,white_6%)]">
        {line.agent_id}
      </span>
      <span
        className={cn(
          'whitespace-pre-wrap break-all',
          line.stream === 'stderr' ? 'text-red-300' : 'text-[color:var(--foreground-soft)]'
        )}
      >
        {line.line}
      </span>
    </div>
  );
}

/** Merges REST-loaded lines with SSE-appended lines, preserving order. */
function mergeLogLines(rest: ApiLogLine[], live: ApiLogLine[]): ApiLogLine[] {
  if (live.length === 0) return rest;
  // Simple approach: concatenate and deduplicate by (timestamp, line).
  // The SSE hook guards duplicates internally, but belt-and-suspenders here.
  const seen = new Set<string>();
  const merged: ApiLogLine[] = [];

  for (const l of [...rest, ...live]) {
    const key = `${l.timestamp}::${l.agent_id}::${l.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(l);
    }
  }

  return merged;
}
