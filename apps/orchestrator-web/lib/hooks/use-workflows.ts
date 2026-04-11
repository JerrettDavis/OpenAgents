'use client';

import { useCallback, useEffect, useState } from 'react';
import { workflowsApi, ApiError } from '@/lib/api/client';
import type { ApiWorkflow } from '@/lib/types/api';

export interface UseWorkflowsState {
  workflows: ApiWorkflow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWorkflows(): UseWorkflowsState {
  const [workflows, setWorkflows] = useState<ApiWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const result = await workflowsApi.list();
      setWorkflows(result.items);
      setError(null);
    } catch (err) {
      // Graceful: workflows endpoint may not be live yet
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load workflows';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkflows();
  }, [fetchWorkflows]);

  return { workflows, loading, error, refetch: fetchWorkflows };
}
