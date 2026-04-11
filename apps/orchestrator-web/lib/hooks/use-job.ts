'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { jobsApi, ApiError } from '@/lib/api/client';
import { ACTIVE_JOB_STATES } from '@/lib/types/domain';
import type { ApiJobDetail } from '@/lib/types/api';

export interface UseJobState {
  job: ApiJobDetail | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  refetch: () => void;
  /** Optimistically update the local job state (e.g., after a Start/Stop action) */
  updateJob: (patch: Partial<ApiJobDetail>) => void;
}

/**
 * Fetches and subscribes to a single job.
 *
 * Polls every `pollIntervalMs` ms while the job is in an active state.
 * Polling stops automatically once the job reaches a terminal state.
 */
export function useJob(jobId: string, pollIntervalMs = 5000): UseJobState {
  const [job, setJob] = useState<ApiJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const jobRef = useRef(job);
  jobRef.current = job;

  const fetchJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const data = await jobsApi.get(jobId);
      setJob(data);
      setError(null);
      setNotFound(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setError(null);
      } else {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to load job';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    void fetchJob();
  }, [fetchJob]);

  // Polling: only while the job is active
  useEffect(() => {
    if (!pollIntervalMs || pollIntervalMs <= 0) return;
    const id = setInterval(() => {
      const current = jobRef.current;
      if (current && !(ACTIVE_JOB_STATES as Set<string>).has(current.state)) {
        // Job is terminal — stop polling
        return;
      }
      void fetchJob();
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchJob, pollIntervalMs]);

  const updateJob = useCallback((patch: Partial<ApiJobDetail>) => {
    setJob((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return { job, loading, error, notFound, refetch: fetchJob, updateJob };
}
