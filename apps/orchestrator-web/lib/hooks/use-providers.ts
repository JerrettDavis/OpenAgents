'use client';

import { useCallback, useEffect, useState } from 'react';
import { providersApi, ApiError } from '@/lib/api/client';
import type { ApiProvider } from '@/lib/types/api';

export function useProviders() {
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await providersApi.list();
      const normalized = Array.isArray(result) ? result : (result.items ?? []);
      setProviders(normalized);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load providers'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProviders();
  }, [fetchProviders]);

  return { providers, loading, error, refetch: fetchProviders };
}
