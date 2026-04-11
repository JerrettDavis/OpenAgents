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

const SYSTEM_INFO_REFRESH_EVENT = 'openagents:system-info-refresh';

export function requestSystemInfoRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SYSTEM_INFO_REFRESH_EVENT));
  }
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRefresh = () => void fetchInfo();
    window.addEventListener(SYSTEM_INFO_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(SYSTEM_INFO_REFRESH_EVENT, handleRefresh);
  }, [fetchInfo]);

  return { info, loading, error, refetch: fetchInfo };
}
