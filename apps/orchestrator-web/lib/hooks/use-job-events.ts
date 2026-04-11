'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { eventsApi, ApiError } from '@/lib/api/client';
import type { ApiEvent } from '@/lib/types/api';

export interface UseJobEventsState {
  events: ApiEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Prepend a new event received via SSE (newest first) */
  prependEvent: (event: ApiEvent) => void;
}

export function useJobEvents(jobId: string, limit = 100): UseJobEventsState {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track seen event IDs to avoid duplicates from SSE + REST
  const seenIds = useRef(new Set<string>());

  const fetchEvents = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const result = await eventsApi.list(jobId, { limit });
      // Sort newest-first for display
      const sorted = [...result.items].sort(
        (a, b) => new Date(b.occurred_at_utc).getTime() - new Date(a.occurred_at_utc).getTime()
      );
      seenIds.current = new Set(sorted.map((e) => e.event_id));
      setEvents(sorted);
      setError(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load events';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [jobId, limit]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const prependEvent = useCallback((event: ApiEvent) => {
    if (seenIds.current.has(event.event_id)) return;
    seenIds.current.add(event.event_id);
    setEvents((prev) => [event, ...prev]);
  }, []);

  return { events, loading, error, refetch: fetchEvents, prependEvent };
}
