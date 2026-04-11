'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logsApi, ApiError } from '@/lib/api/client';
import type { ApiLogLine } from '@/lib/types/api';

/** Maximum number of log lines kept in memory to prevent runaway growth. */
const MAX_LOG_LINES = 2000;

export interface UseJobLogsState {
  lines: ApiLogLine[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Append a new line received via SSE */
  appendLine: (line: ApiLogLine) => void;
}

export function useJobLogs(jobId: string, limit = 500): UseJobLogsState {
  const [lines, setLines] = useState<ApiLogLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const result = await logsApi.list(jobId, { limit });
      setLines(result.items);
      setError(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load logs';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [jobId, limit]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const appendLine = useCallback((line: ApiLogLine) => {
    setLines((prev) => {
      const next = [...prev, line];
      // Trim from head if we exceed max
      return next.length > MAX_LOG_LINES ? next.slice(next.length - MAX_LOG_LINES) : next;
    });
  }, []);

  return { lines, loading, error, refetch: fetchLogs, appendLine };
}
