#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# providers/claude-code/scripts/entrypoint.sh
#
# Main entrypoint for the Claude Code provider container.
#
# Lifecycle:
#   1. Validate required environment variables (fail-fast)
#   2. Initialise workspace structure (init-workspace.sh)
#   3. Emit agent.started event
#   4. Check mailbox for pending notifications (boundary-based polling)
#   5. Resolve task prompt (TASK_PROMPT env var or .agent-orch/current-task.md)
#   6. Run Claude Code CLI in stream-json mode
#   7. Emit agent.completed or agent.failed event
#   8. Exit with Claude's exit code
#
# Required environment variables:
#   ANTHROPIC_API_KEY  – Anthropic API key (no default; must be injected at runtime)
#   JOB_ID             – OpenAgents job identifier
#   WORKFLOW_ID        – workflow slug, e.g. "planning"
#   STAGE_ID           – active stage id
#   TASK_ID            – active task id
#   WORKSPACE_PATH     – absolute path to the project workspace
#
# Optional environment variables:
#   TASK_PROMPT        – prompt for this task; if empty, reads from
#                        $WORKSPACE_PATH/.agent-orch/current-task.md
#   PRIMARY_MODEL      – model to use (default: claude-opus-4-5)
#   ITERATIONS__TASK   – max Claude turns before forced stop (default: 3)
#   AGENT_ID           – stable agent identity label (default: agent-${JOB_ID})
#   PROVIDER_ID        – provider id label (default: claude-code)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
PRIMARY_MODEL="${PRIMARY_MODEL:-claude-opus-4-5}"
WORKSPACE_PATH="${WORKSPACE_PATH:-/workspace/project}"
MAILBOX_PATH="${MAILBOX_PATH:-$WORKSPACE_PATH/.mailbox}"
JOB_ID="${JOB_ID:-}"
WORKFLOW_ID="${WORKFLOW_ID:-}"
WORKFLOW_VERSION="${WORKFLOW_VERSION:-0.1.0}"
STAGE_ID="${STAGE_ID:-}"
TASK_ID="${TASK_ID:-}"
PROVIDER_ID="${PROVIDER_ID:-claude-code}"
AGENT_ID="${AGENT_ID:-agent-${JOB_ID:-unknown}}"
ITERATIONS__TASK="${ITERATIONS__TASK:-3}"
TASK_PROMPT="${TASK_PROMPT:-}"

export JOB_ID WORKFLOW_ID STAGE_ID TASK_ID AGENT_ID PROVIDER_ID WORKSPACE_PATH

# ── 1. Fail-fast validation ────────────────────────────────────────────────────
ERRORS=0

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    # Check for OAuth credentials (mounted from host ~/.claude)
    CLAUDE_CREDS="${HOME}/.claude/.credentials.json"
    if [ -f "$CLAUDE_CREDS" ]; then
        echo "[entrypoint] Using OAuth credentials from $CLAUDE_CREDS"
    else
        echo "[entrypoint] ERROR: ANTHROPIC_API_KEY is not set and no OAuth credentials found." >&2
        echo "[entrypoint] Provide -e ANTHROPIC_API_KEY=sk-ant-... or mount ~/.claude for OAuth." >&2
        ERRORS=$((ERRORS + 1))
    fi
fi
if [ -z "$JOB_ID" ]; then
    echo "[entrypoint] ERROR: JOB_ID is not set." >&2
    ERRORS=$((ERRORS + 1))
fi
if [ -z "$WORKFLOW_ID" ]; then
    echo "[entrypoint] ERROR: WORKFLOW_ID is not set." >&2
    ERRORS=$((ERRORS + 1))
fi
if [ -z "$STAGE_ID" ]; then
    echo "[entrypoint] ERROR: STAGE_ID is not set." >&2
    ERRORS=$((ERRORS + 1))
fi
if [ "$ERRORS" -gt 0 ]; then
    echo "[entrypoint] Aborting due to $ERRORS missing required environment variable(s)." >&2
    exit 1
fi

echo "[entrypoint] Starting Claude Code provider"
echo "[entrypoint]   JOB_ID        = $JOB_ID"
echo "[entrypoint]   WORKFLOW_ID   = $WORKFLOW_ID"
echo "[entrypoint]   STAGE_ID      = $STAGE_ID"
echo "[entrypoint]   TASK_ID       = ${TASK_ID:-<none>}"
echo "[entrypoint]   WORKSPACE     = $WORKSPACE_PATH"
echo "[entrypoint]   MODEL         = $PRIMARY_MODEL"

# ── 2. Initialise workspace structure ─────────────────────────────────────────
export WORKFLOW_VERSION
/usr/local/bin/init-workspace.sh

# ── 3. Emit agent.started event ───────────────────────────────────────────────
/usr/local/bin/emit-event.sh \
    "agent.started" \
    "Agent started" \
    "Claude Code agent started for job $JOB_ID stage $STAGE_ID" \
    "{\"model\": \"$PRIMARY_MODEL\", \"provider\": \"$PROVIDER_ID\"}" || true

# ── 4. Boundary-based mailbox polling ─────────────────────────────────────────
PENDING="$WORKSPACE_PATH/.agent-orch/mailbox-index/pending-notifications.md"
if [ -f "$PENDING" ]; then
    PENDING_LINES=$(grep -c '^[0-9]' "$PENDING" 2>/dev/null || echo "0")
    if [ "$PENDING_LINES" -gt 0 ]; then
        echo "[entrypoint] Mailbox: $PENDING_LINES pending notification(s) — processing before task start"
        # Append notification context to the task prompt (resolved below)
        NOTIFICATION_CONTEXT=$(grep '^[0-9]' "$PENDING" | head -20 || true)
    fi
fi

# ── 5. Resolve task prompt ────────────────────────────────────────────────────
TASK_FILE="$WORKSPACE_PATH/.agent-orch/current-task.md"

if [ -n "$TASK_PROMPT" ]; then
    echo "[entrypoint] Task prompt sourced from TASK_PROMPT environment variable"
    RESOLVED_PROMPT="$TASK_PROMPT"
elif [ -f "$TASK_FILE" ]; then
    echo "[entrypoint] Task prompt sourced from $TASK_FILE"
    RESOLVED_PROMPT=$(cat "$TASK_FILE")
else
    echo "[entrypoint] WARNING: No TASK_PROMPT set and $TASK_FILE not found." >&2
    echo "[entrypoint] Falling back to generic task prompt." >&2
    RESOLVED_PROMPT="Review the workspace at $WORKSPACE_PATH and update TODO.md to reflect the current state of work for workflow $WORKFLOW_ID stage $STAGE_ID."
fi

# Append workspace context to prompt
RESOLVED_PROMPT="$RESOLVED_PROMPT

---
Workspace: $WORKSPACE_PATH
Job: $JOB_ID | Workflow: $WORKFLOW_ID | Stage: $STAGE_ID
TODO.md path: $WORKSPACE_PATH/TODO.md

Always update TODO.md as you work. Write important decisions to TODO.md ## Decisions section.
When finished, emit a final report to $WORKSPACE_PATH/.agent-orch/reports/."

# ── 6. Run Claude Code CLI ────────────────────────────────────────────────────
echo "[entrypoint] Invoking Claude Code (model: $PRIMARY_MODEL, max-turns: $ITERATIONS__TASK)"

CLAUDE_EXIT=0
claude \
    --output-format stream-json \
    --verbose \
    --model "$PRIMARY_MODEL" \
    --max-turns "$ITERATIONS__TASK" \
    --print \
    "$RESOLVED_PROMPT" 2>&1 | tee "$WORKSPACE_PATH/.agent-orch/logs/claude-$(date -u +%Y%m%dT%H%M%SZ).jsonl" \
    || CLAUDE_EXIT=$?

# ── 7. Update state.json ──────────────────────────────────────────────────────
STATE_JSON="$WORKSPACE_PATH/.agent-orch/state.json"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FINAL_STATE="completed"
[ "$CLAUDE_EXIT" -ne 0 ] && FINAL_STATE="failed"

if command -v jq &>/dev/null && [ -f "$STATE_JSON" ]; then
    jq --arg state "$FINAL_STATE" \
       --arg updated_at "$NOW" \
       --argjson exit_code "$CLAUDE_EXIT" \
       '.state = $state | .updated_at_utc = $updated_at | .exit_code = $exit_code' \
       "$STATE_JSON" > "${STATE_JSON}.tmp" && mv "${STATE_JSON}.tmp" "$STATE_JSON"
fi

# ── 8. Emit completion event ──────────────────────────────────────────────────
if [ "$CLAUDE_EXIT" -eq 0 ]; then
    /usr/local/bin/emit-event.sh \
        "agent.completed" \
        "Agent completed" \
        "Claude Code agent completed job $JOB_ID stage $STAGE_ID" \
        "{\"exit_code\": 0, \"provider\": \"$PROVIDER_ID\"}" || true
    echo "[entrypoint] Agent completed successfully."
else
    /usr/local/bin/emit-event.sh \
        "agent.failed" \
        "Agent failed" \
        "Claude Code agent failed for job $JOB_ID stage $STAGE_ID (exit code $CLAUDE_EXIT)" \
        "{\"exit_code\": $CLAUDE_EXIT, \"provider\": \"$PROVIDER_ID\"}" || true
    echo "[entrypoint] Agent exited with code $CLAUDE_EXIT." >&2
fi

exit "$CLAUDE_EXIT"
