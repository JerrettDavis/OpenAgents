'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { jobSseUrl } from '@/lib/api/client';
import type { ApiJobDetail, ApiLogLine, ApiEvent, SseEventType } from '@/lib/types/api';

export type SseConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface SseJobEvent {
  type: SseEventType | string;
  data: unknown;
  eventId: string | null;
}

export interface UseJobSseOptions {
  /** Called for every non-log, non-heartbeat SSE event */
  onEvent?: (event: SseJobEvent) => void;
  /** Called when a log.line SSE event arrives */
  onLogLine?: (line: ApiLogLine) => void;
  /** Called when a job.* state-change event arrives with the new state */
  onJobStateChange?: (patch: Partial<ApiJobDetail>) => void;
  /** Whether to connect at all (set false for terminal jobs) */
  enabled?: boolean;
}

export interface UseJobSseState {
  connectionState: SseConnectionState;
  lastEventId: string | null;
  lastHeartbeatAt: string | null;
}

// Job state-change events that carry a new state in payload
const JOB_STATE_EVENTS = new Set<string>([
  'job.queued',
  'job.provisioning_started',
  'job.started',
  'job.paused',
  'job.resumed',
  'job.stopping',
  'job.completed',
  'job.failed',
  'job.archived',
]);

// Terminal job events: after one of these arrives the server will close the
// stream.  We proactively call es.close() so the browser never sees the
// resulting ERR_INCOMPLETE_CHUNKED_ENCODING and never auto-reconnects.
const TERMINAL_SSE_EVENTS = new Set<string>(['job.completed', 'job.failed', 'job.archived']);

const SSE_EVENT_TO_STATE: Record<string, ApiJobDetail['state']> = {
  'job.queued': 'Queued',
  'job.provisioning_started': 'Provisioning',
  'job.started': 'Running',
  'job.paused': 'Paused',
  'job.resumed': 'Running',
  'job.stopping': 'Stopping',
  'job.completed': 'Completed',
  'job.failed': 'Error',
  'job.archived': 'Archived',
};

/**
 * Manages a Server-Sent Events connection to /api/v1/stream/jobs/:jobId.
 *
 * Implements Last-Event-ID reconnection as per the API contract.
 * Safe to mount/unmount — always cleans up the EventSource on unmount.
 */
export function useJobSse(jobId: string, options: UseJobSseOptions = {}): UseJobSseState {
  const { onEvent, onLogLine, onJobStateChange, enabled = true } = options;

  const [connectionState, setConnectionState] = useState<SseConnectionState>('connecting');
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);

  // Stable callback refs so the effect doesn't re-run when callbacks change
  const onEventRef = useRef(onEvent);
  const onLogLineRef = useRef(onLogLine);
  const onJobStateChangeRef = useRef(onJobStateChange);
  onEventRef.current = onEvent;
  onLogLineRef.current = onLogLine;
  onJobStateChangeRef.current = onJobStateChange;

  const lastEventIdRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (!enabled || !jobId) return;

    setConnectionState('connecting');

    const url = jobSseUrl(jobId);
    const headers: Record<string, string> = {};
    if (lastEventIdRef.current) {
      // EventSource doesn't support custom headers directly.
      // Append as query param as a fallback for servers that support it,
      // OR rely on browser native Last-Event-ID header if using EventSource.
      // Most SSE server implementations use the built-in header; EventSource
      // will send it automatically after the first event is received.
    }

    const es = new EventSource(url);

    es.onopen = () => {
      setConnectionState('connected');
    };

    es.onerror = () => {
      // EventSource will auto-reconnect; we just update UI state
      setConnectionState('connecting');
    };

    // Heartbeat
    es.addEventListener('heartbeat', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data as string) as { ts: string };
        setLastHeartbeatAt(parsed.ts);
      } catch {
        /* ignore malformed heartbeat */
      }
    });

    // Log lines
    es.addEventListener('log.line', (e: MessageEvent) => {
      if (e.lastEventId) {
        lastEventIdRef.current = e.lastEventId;
        setLastEventId(e.lastEventId);
      }
      try {
        const line = JSON.parse(e.data as string) as ApiLogLine;
        onLogLineRef.current?.(line);
      } catch {
        /* ignore malformed log line */
      }
    });

    // All other named events — wire them up dynamically via the generic handler
    es.onmessage = (e: MessageEvent) => {
      // onmessage fires for events with no `event:` field (unnamed events)
      if (e.lastEventId) {
        lastEventIdRef.current = e.lastEventId;
        setLastEventId(e.lastEventId);
      }
      try {
        const data = JSON.parse(e.data as string) as unknown;
        const sseEvent: SseJobEvent = {
          type: 'message',
          data,
          eventId: e.lastEventId || null,
        };
        onEventRef.current?.(sseEvent);
      } catch {
        /* ignore */
      }
    };

    // Wire named job/stage/task/agent events
    const NAMED_EVENTS: string[] = [
      'job.queued',
      'job.provisioning_started',
      'job.started',
      'job.paused',
      'job.resumed',
      'job.stopping',
      'job.completed',
      'job.failed',
      'job.archived',
      'stage.started',
      'stage.completed',
      'stage.failed',
      'stage.skipped',
      'task.started',
      'task.completed',
      'task.failed',
      'task.blocked',
      'agent.started',
      'agent.completed',
      'agent.failed',
      'agent.disconnected',
      'mailbox.message_delivered',
      'mailbox.message_read',
    ];

    for (const eventType of NAMED_EVENTS) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        if (e.lastEventId) {
          lastEventIdRef.current = e.lastEventId;
          setLastEventId(e.lastEventId);
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(e.data as string);
        } catch {
          parsed = e.data;
        }

        const sseEvent: SseJobEvent = {
          type: eventType as SseEventType,
          data: parsed,
          eventId: e.lastEventId || null,
        };
        onEventRef.current?.(sseEvent);

        // Handle job state transitions
        if (JOB_STATE_EVENTS.has(eventType)) {
          const newState = SSE_EVENT_TO_STATE[eventType];
          if (newState) {
            onJobStateChangeRef.current?.({ state: newState });
          }
        }

        // For terminal events the server will close the stream immediately
        // after.  Proactively close the EventSource so the browser never
        // fires ERR_INCOMPLETE_CHUNKED_ENCODING and never auto-reconnects.
        if (TERMINAL_SSE_EVENTS.has(eventType)) {
          es.close();
          setConnectionState('disconnected');
        }
      });
    }

    return es;
  }, [enabled, jobId]);

  useEffect(() => {
    if (!enabled || !jobId) return;

    const es = connect();
    if (!es) return;

    return () => {
      es.close();
      setConnectionState('disconnected');
    };
  }, [connect, enabled, jobId]);

  return { connectionState, lastEventId, lastHeartbeatAt };
}
