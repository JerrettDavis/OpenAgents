'use client';

import { useCallback, useEffect, useState } from 'react';
import { artifactsApi, ApiError } from '@/lib/api/client';
import type { ApiArtifact } from '@/lib/types/api';

export function useArtifacts(jobId: string, path?: string) {
  const [items, setItems] = useState<ApiArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArtifacts = useCallback(async () => {
    if (!jobId) {
      setItems([]);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const result = await artifactsApi.list(jobId, path);
      setItems(result.items);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load artifacts'
      );
    } finally {
      setLoading(false);
    }
  }, [jobId, path]);

  useEffect(() => {
    void fetchArtifacts();
  }, [fetchArtifacts]);

  return { items, loading, error, refetch: fetchArtifacts };
}
