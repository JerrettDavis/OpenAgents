"use client";

import { useEffect, useRef } from "react";
import { useJobLogs } from "@/lib/hooks/use-job-logs";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatLogTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiLogLine } from "@/lib/types/api";

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-1.5">
        <span className="text-xs text-zinc-500">
          {allLines.length} lines
        </span>
        <button
          onClick={refetch}
          className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
        >
          ↺ Reload
        </button>
      </div>

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
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
    <div className="flex gap-3 hover:bg-zinc-900/40">
      <span className="shrink-0 select-none text-zinc-700">
        {formatLogTime(line.timestamp)}
      </span>
      <span className="shrink-0 select-none text-zinc-600">
        {line.agent_id}
      </span>
      <span
        className={cn(
          "whitespace-pre-wrap break-all",
          line.stream === "stderr" ? "text-red-400" : "text-zinc-300"
        )}
      >
        {line.line}
      </span>
    </div>
  );
}

/** Merges REST-loaded lines with SSE-appended lines, preserving order. */
function mergeLogLines(
  rest: ApiLogLine[],
  live: ApiLogLine[]
): ApiLogLine[] {
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
