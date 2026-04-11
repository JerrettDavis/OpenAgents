'use client';

import { useCallback, useEffect, useState } from 'react';
import { systemApi, ApiError } from '@/lib/api/client';

export interface SystemInfo {
  version: string;
  providers_loaded: string[];
  workflows_loaded: string[];
  active_jobs: number;
  workspace_root: string;
}

export function useSystemInfo() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    try {
      const result = (await systemApi.info()) as SystemInfo;
      setInfo(result);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load system info'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInfo();
  }, [fetchInfo]);

  return { info, loading, error, refetch: fetchInfo };
}
