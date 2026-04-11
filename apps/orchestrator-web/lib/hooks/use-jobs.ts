'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { jobsApi, type ListJobsParams, ApiError } from '@/lib/api/client';
import type { ApiJobSummary } from '@/lib/types/api';

export interface UseJobsState {
  jobs: ApiJobSummary[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  refetch: () => void;
}

/**
 * Fetches the jobs list from the API.
 *
 * Automatically re-fetches every `pollIntervalMs` milliseconds when any
 * jobs are in an active state, or when `params` changes.
 * Pass `pollIntervalMs={0}` to disable polling.
 */
export function useJobs(params: ListJobsParams = {}, pollIntervalMs = 5000): UseJobsState {
  const [jobs, setJobs] = useState<ApiJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Stable reference to params to avoid unnecessary re-fetches
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchJobs = useCallback(async () => {
    try {
      const result = await jobsApi.list(paramsRef.current);
      setJobs(result.items);
      setTotalCount(result.pagination.total);
      setHasMore(result.pagination.has_more);
      setNextCursor(result.pagination.next_cursor);
      setError(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load jobs';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    void fetchJobs();
  }, [fetchJobs, params.state, params.outcome]);

  // Polling when active jobs exist
  useEffect(() => {
    if (!pollIntervalMs || pollIntervalMs <= 0) return;
    const id = setInterval(() => {
      void fetchJobs();
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchJobs, pollIntervalMs]);

  return {
    jobs,
    loading,
    error,
    totalCount,
    hasMore,
    nextCursor,
    refetch: fetchJobs,
  };
}
