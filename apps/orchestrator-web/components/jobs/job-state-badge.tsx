import { Badge } from "@/components/ui/badge";
import type { ApiJobState, ApiJobOutcome, ApiConnectionStatus } from "@/lib/types/api";

// ── State badge ───────────────────────────────────────────────────────

interface JobStateBadgeProps {
  state: ApiJobState;
}

const STATE_VARIANT: Record<
  ApiJobState,
  NonNullable<React.ComponentProps<typeof Badge>["variant"]>
> = {
  Pending: "muted",
  Queued: "info",
  Provisioning: "blue",
  Connecting: "blue",
  Running: "blue",
  Paused: "amber",
  Stopping: "amber",
  Completed: "success",
  Error: "error",
  Archived: "muted",
};

const STATE_LIVE = new Set<ApiJobState>([
  "Queued",
  "Provisioning",
  "Connecting",
  "Running",
  "Stopping",
]);

export function JobStateBadge({ state }: JobStateBadgeProps) {
  const isLive = STATE_LIVE.has(state);
  return (
    <Badge variant={STATE_VARIANT[state]} dot={isLive}>
      {state}
    </Badge>
  );
}

// ── Outcome badge ─────────────────────────────────────────────────────

interface JobOutcomeBadgeProps {
  outcome: ApiJobOutcome;
}

const OUTCOME_VARIANT: Record<
  ApiJobOutcome,
  NonNullable<React.ComponentProps<typeof Badge>["variant"]>
> = {
  NotStarted: "muted",
  CompletedSuccessfully: "success",
  CompletedAbnormally: "warning",
  CompletedWithErrors: "warning",
  PartiallyCompleted: "warning",
  Incomplete: "amber",
  Failed: "error",
  Invalid: "error",
};

const OUTCOME_LABEL: Record<ApiJobOutcome, string> = {
  NotStarted: "Not started",
  CompletedSuccessfully: "Success",
  CompletedAbnormally: "Abnormal",
  CompletedWithErrors: "With errors",
  PartiallyCompleted: "Partial",
  Incomplete: "Incomplete",
  Failed: "Failed",
  Invalid: "Invalid",
};

export function JobOutcomeBadge({ outcome }: JobOutcomeBadgeProps) {
  if (outcome === "NotStarted") return null;
  return (
    <Badge variant={OUTCOME_VARIANT[outcome]}>{OUTCOME_LABEL[outcome]}</Badge>
  );
}

// ── Connection badge ──────────────────────────────────────────────────

interface ConnectionBadgeProps {
  status: ApiConnectionStatus;
}

const CONNECTION_VARIANT: Record<
  ApiConnectionStatus,
  NonNullable<React.ComponentProps<typeof Badge>["variant"]>
> = {
  Unknown: "muted",
  Connecting: "info",
  Connected: "success",
  Flakey: "warning",
  Failing: "error",
  Failed: "error",
  Disconnected: "muted",
};

export function ConnectionBadge({ status }: ConnectionBadgeProps) {
  return (
    <Badge variant={CONNECTION_VARIANT[status]} dot={status === "Connected"}>
      {status}
    </Badge>
  );
}
