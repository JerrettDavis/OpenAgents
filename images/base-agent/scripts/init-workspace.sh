#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# init-workspace.sh
#
# Initialises the standard workspace directory structure required by the
# OpenAgents workspace contract (docs/plans/WORKSPACE-CONTRACT.md).
#
# Expected environment variables:
#   WORKSPACE_PATH   – absolute path to the project workspace, e.g. /workspace/my-project
#   JOB_ID           – job identifier (written into job.json + TODO.md)
#   WORKFLOW_ID      – workflow slug, e.g. "planning"
#   WORKFLOW_VERSION – workflow version, e.g. "0.1.0"
#   STAGE_ID         – active stage id, e.g. "plan"
#
# Usage:
#   source /usr/local/bin/init-workspace.sh
#   # – or –
#   WORKSPACE_PATH=/workspace/my-project JOB_ID=job_abc123 init-workspace.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

WORKSPACE_PATH="${WORKSPACE_PATH:-/workspace/project}"
JOB_ID="${JOB_ID:-unknown-job}"
WORKFLOW_ID="${WORKFLOW_ID:-unknown-workflow}"
WORKFLOW_VERSION="${WORKFLOW_VERSION:-0.0.0}"
STAGE_ID="${STAGE_ID:-unknown-stage}"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "[init-workspace] Initialising workspace at: $WORKSPACE_PATH"

# ── Core project directory ─────────────────────────────────────────────────────
mkdir -p "$WORKSPACE_PATH"

# ── Git safe.directory (scoped to this workspace only) ────────────────────────
# Required because the workspace is bind-mounted from the host and may be owned
# by a different uid. We trust only the exact workspace path, not '*', to limit
# the blast radius if an untrusted path is somehow passed as WORKSPACE_PATH.
git config --global safe.directory "$WORKSPACE_PATH"

# ── .mailbox subdirectories ────────────────────────────────────────────────────
mkdir -p \
    "$WORKSPACE_PATH/.mailbox/inbox" \
    "$WORKSPACE_PATH/.mailbox/drafts" \
    "$WORKSPACE_PATH/.mailbox/outbox" \
    "$WORKSPACE_PATH/.mailbox/sent" \
    "$WORKSPACE_PATH/.mailbox/archived"

# ── .agent-orch subdirectories ─────────────────────────────────────────────────
mkdir -p \
    "$WORKSPACE_PATH/.agent-orch/events" \
    "$WORKSPACE_PATH/.agent-orch/logs" \
    "$WORKSPACE_PATH/.agent-orch/artifacts" \
    "$WORKSPACE_PATH/.agent-orch/reports" \
    "$WORKSPACE_PATH/.agent-orch/metrics" \
    "$WORKSPACE_PATH/.agent-orch/stages" \
    "$WORKSPACE_PATH/.agent-orch/tasks" \
    "$WORKSPACE_PATH/.agent-orch/mailbox-index"

# ── Seed mailbox-index / pending-notifications (boundary-based polling) ────────
PENDING_NOTIFICATIONS="$WORKSPACE_PATH/.agent-orch/mailbox-index/pending-notifications.md"
if [ ! -f "$PENDING_NOTIFICATIONS" ]; then
    cat > "$PENDING_NOTIFICATIONS" <<'PENDING_EOF'
# Pending Notifications
<!-- OpenAgents: boundary-based polling — check this file before/after each stage and task -->
<!-- Format: one entry per line: <iso-timestamp> <type> <message> -->
PENDING_EOF
fi

# ── job.json (static execution context) ───────────────────────────────────────
JOB_JSON="$WORKSPACE_PATH/.agent-orch/job.json"
if [ ! -f "$JOB_JSON" ]; then
    jq -n \
      --arg job_id "$JOB_ID" \
      --arg workflow_id "$WORKFLOW_ID" \
      --arg workflow_version "$WORKFLOW_VERSION" \
      --arg stage_id "$STAGE_ID" \
      --arg created_at "$NOW" \
      --arg workspace_path "$WORKSPACE_PATH" \
      '{
        job_id: $job_id,
        workflow_id: $workflow_id,
        workflow_version: $workflow_version,
        stage_id: $stage_id,
        created_at_utc: $created_at,
        workspace_path: $workspace_path
      }' > "$JOB_JSON"
fi

# ── workflow.json (workflow definition snapshot) ───────────────────────────────
WORKFLOW_JSON="$WORKSPACE_PATH/.agent-orch/workflow.json"
if [ ! -f "$WORKFLOW_JSON" ]; then
    jq -n \
      --arg workflow_id "$WORKFLOW_ID" \
      --arg workflow_version "$WORKFLOW_VERSION" \
      --arg loaded_at "$NOW" \
      '{
        workflow_id: $workflow_id,
        workflow_version: $workflow_version,
        loaded_at_utc: $loaded_at
      }' > "$WORKFLOW_JSON"
fi

# ── state.json (mutable execution state) ──────────────────────────────────────
STATE_JSON="$WORKSPACE_PATH/.agent-orch/state.json"
if [ ! -f "$STATE_JSON" ]; then
    jq -n \
      --arg job_id "$JOB_ID" \
      --arg stage_id "$STAGE_ID" \
      --arg updated_at "$NOW" \
      '{
        job_id: $job_id,
        state: "provisioning",
        stage_id: $stage_id,
        updated_at_utc: $updated_at
      }' > "$STATE_JSON"
fi

# ── TODO.md (seed if absent — agents keep this up to date) ────────────────────
TODO_MD="$WORKSPACE_PATH/TODO.md"
if [ ! -f "$TODO_MD" ]; then
    cat > "$TODO_MD" <<TODO_EOF
# TODO

## Metadata
job_id: ${JOB_ID}
workflow: ${WORKFLOW_ID}
stage: ${STAGE_ID}

## Stages
- [ ] ${STAGE_ID}: Active Stage

## Tasks
- [ ] task-001: Initial task

## Decisions

## Notes
TODO_EOF
fi

# ── Git init (if not already a repo) ──────────────────────────────────────────
if [ ! -d "$WORKSPACE_PATH/.git" ]; then
    echo "[init-workspace] Initialising git repository..."
    git -C "$WORKSPACE_PATH" init
    git -C "$WORKSPACE_PATH" config user.email "agent@openagents.local"
    git -C "$WORKSPACE_PATH" config user.name "OpenAgents"
fi

echo "[init-workspace] Workspace ready at: $WORKSPACE_PATH"
