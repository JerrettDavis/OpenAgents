'use client';

import { useCallback, useEffect, useState } from 'react';
import { stagesApi, ApiError } from '@/lib/api/client';
import type { ApiStage } from '@/lib/types/api';

export interface UseJobStagesState {
  stages: ApiStage[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useJobStages(jobId: string): UseJobStagesState {
  const [stages, setStages] = useState<ApiStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStages = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const result = await stagesApi.list(jobId);
      setStages(result.items);
      setError(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load stages';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void fetchStages();
  }, [fetchStages]);

  return { stages, loading, error, refetch: fetchStages };
}
