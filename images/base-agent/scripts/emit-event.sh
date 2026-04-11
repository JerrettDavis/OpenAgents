#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# emit-event.sh
#
# Writes a canonical OpenAgents event envelope (docs/plans/EVENT-SCHEMAS.md)
# as a JSON file to .agent-orch/events/ inside the current workspace.
#
# The orchestrator watches that directory via FileSystemWatcher, ingests new
# files, appends them to the event_log table, and broadcasts via SSE.
#
# Usage:
#   emit-event.sh <event_type> <title> [summary] [payload_json]
#
# Arguments:
#   event_type   – dot-separated type, e.g. "job.started", "task.completed"
#   title        – short human-readable title
#   summary      – optional one-line summary (default: "")
#   payload_json – optional JSON object string (default: "{}")
#
# Required environment variables (inherited from container):
#   JOB_ID          – the job this event belongs to
#   WORKFLOW_ID     – the active workflow
#   STAGE_ID        – the active stage (may be empty)
#   TASK_ID         – the active task (may be empty)
#   AGENT_ID        – this agent's identifier
#   WORKSPACE_PATH  – workspace root (used to locate .agent-orch/events/)
#   PROVIDER_ID     – provider identifier, e.g. "claude-code"
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

EVENT_TYPE="${1:-system.unknown}"
TITLE="${2:-Event}"
SUMMARY="${3:-}"
PAYLOAD="${4:-{}}"

JOB_ID="${JOB_ID:-}"
WORKFLOW_ID="${WORKFLOW_ID:-}"
STAGE_ID="${STAGE_ID:-}"
TASK_ID="${TASK_ID:-}"
AGENT_ID="${AGENT_ID:-agent-unknown}"
PROVIDER_ID="${PROVIDER_ID:-claude-code}"
WORKSPACE_PATH="${WORKSPACE_PATH:-/workspace/project}"

EVENTS_DIR="$WORKSPACE_PATH/.agent-orch/events"
mkdir -p "$EVENTS_DIR"

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Slugify event type for filename
EVENT_SLUG=$(echo "$EVENT_TYPE" | tr '.' '-' | tr ':' '-' | tr '[:upper:]' '[:lower:]')
# Generate a unique event id
if command -v uuidgen &>/dev/null; then
    RAW_UUID=$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]')
    EVENT_ID="evt_${RAW_UUID:0:16}"
else
    EVENT_ID="evt_$(head -c 8 /dev/urandom | xxd -p 2>/dev/null || date +%s%N | tail -c 16)"
fi

# Build filename: ISO timestamp (colons replaced) + event slug + id
TS_SAFE=$(echo "$NOW" | tr ':' '-')
FILENAME="${TS_SAFE}-${EVENT_SLUG}-${EVENT_ID}.json"
FILEPATH="$EVENTS_DIR/$FILENAME"

# Null-safe stage/task helpers
STAGE_JSON="null"
TASK_JSON="null"
AGENT_JSON="null"
[ -n "$STAGE_ID" ] && STAGE_JSON="\"$STAGE_ID\""
[ -n "$TASK_ID"  ] && TASK_JSON="\"$TASK_ID\""
[ -n "$AGENT_ID" ] && AGENT_JSON="\"$AGENT_ID\""

jq -n \
  --arg schema_version "1.0.0" \
  --arg event_id       "$EVENT_ID" \
  --arg event_type     "$EVENT_TYPE" \
  --arg occurred_at    "$NOW" \
  --arg recorded_at    "$NOW" \
  --arg agent_id       "$AGENT_ID" \
  --arg provider_id    "$PROVIDER_ID" \
  --arg job_id         "$JOB_ID" \
  --arg workflow_id    "$WORKFLOW_ID" \
  --argjson stage_id   "$STAGE_JSON" \
  --argjson task_id    "$TASK_JSON" \
  --arg title          "$TITLE" \
  --arg summary        "$SUMMARY" \
  --argjson payload    "$PAYLOAD" \
  '{
    schema_version: $schema_version,
    event_id:       $event_id,
    event_type:     $event_type,
    occurred_at_utc: $occurred_at,
    recorded_at_utc: $recorded_at,
    source: {
      kind:             "agent",
      instance_id:      $agent_id,
      provider_id:      $provider_id,
      provider_version: null
    },
    correlation: {
      job_id:           $job_id,
      workflow_id:      $workflow_id,
      workflow_version: null,
      stage_id:         $stage_id,
      task_id:          $task_id,
      agent_id:         $agent_id,
      workspace_id:     null,
      mail_message_id:  null,
      thread_id:        null,
      correlation_id:   null
    },
    severity: "info",
    title:    $title,
    summary:  $summary,
    payload:  $payload,
    extensions: {}
  }' > "$FILEPATH"

echo "[emit-event] $EVENT_TYPE → $FILEPATH"
