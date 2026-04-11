/**
 * Formatting utilities for dates, durations, and other display values.
 * Pure functions — no side effects, no imports beyond stdlib.
 */

// ── Date / time ───────────────────────────────────────────────────────

/** Formats an ISO UTC timestamp to a locale-aware date-time string. */
export function formatDateTime(isoUtc: string | null | undefined): string {
  if (!isoUtc) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(isoUtc));
  } catch {
    return isoUtc;
  }
}

/** Formats an ISO UTC timestamp to a relative "X ago" / "in X" string. */
export function formatRelativeTime(isoUtc: string | null | undefined): string {
  if (!isoUtc) return '—';
  try {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const diffMs = new Date(isoUtc).getTime() - Date.now();
    const diffSec = Math.round(diffMs / 1000);
    const absSec = Math.abs(diffSec);

    if (absSec < 60) return rtf.format(diffSec, 'second');
    if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
    if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
    return rtf.format(Math.round(diffSec / 86400), 'day');
  } catch {
    return formatDateTime(isoUtc);
  }
}

/** Formats a log timestamp to HH:MM:SS.mmm */
export function formatLogTime(isoUtc: string | null | undefined): string {
  if (!isoUtc) return '';
  try {
    const d = new Date(isoUtc);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  } catch {
    return isoUtc;
  }
}

// ── Duration ──────────────────────────────────────────────────────────

/** Formats a duration in milliseconds to a human-readable string. */
export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remS = s % 60;
  if (m < 60) return remS > 0 ? `${m}m ${remS}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
}

/**
 * Computes elapsed duration from a start timestamp to now (or a finish
 * timestamp) and formats it.
 */
export function formatElapsed(
  startedAt: string | null | undefined,
  finishedAt?: string | null
): string {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  return formatDurationMs(end - start);
}

// ── Text ──────────────────────────────────────────────────────────────

/** Truncates a string to `max` chars, appending "…" if truncated. */
export function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/** Converts a snake_case / camelCase string to Title Case words. */
export function toTitleCase(s: string): string {
  return s
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
