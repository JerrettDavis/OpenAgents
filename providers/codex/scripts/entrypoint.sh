#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_PATH="${WORKSPACE_PATH:-/workspace/project}"
MAILBOX_PATH="${MAILBOX_PATH:-$WORKSPACE_PATH/.mailbox}"
JOB_ID="${JOB_ID:-}"
WORKFLOW_ID="${WORKFLOW_ID:-}"
WORKFLOW_VERSION="${WORKFLOW_VERSION:-0.1.0}"
STAGE_ID="${STAGE_ID:-}"
TASK_ID="${TASK_ID:-}"
PROVIDER_ID="${PROVIDER_ID:-codex}"
AGENT_ID="${AGENT_ID:-agent-${JOB_ID:-unknown}}"
TASK_PROMPT="${TASK_PROMPT:-}"
PRIMARY_MODEL="${PRIMARY_MODEL:-}"

export JOB_ID WORKFLOW_ID STAGE_ID TASK_ID AGENT_ID PROVIDER_ID WORKSPACE_PATH

ERRORS=0
if [ -z "${OPENAI_API_KEY:-}" ]; then
    echo "[entrypoint] ERROR: OPENAI_API_KEY is not set." >&2
    ERRORS=$((ERRORS + 1))
fi
if [ -z "$JOB_ID" ] || [ -z "$WORKFLOW_ID" ] || [ -z "$STAGE_ID" ]; then
    echo "[entrypoint] ERROR: JOB_ID, WORKFLOW_ID, and STAGE_ID are required." >&2
    ERRORS=$((ERRORS + 1))
fi
if [ "$ERRORS" -gt 0 ]; then
    exit 1
fi

/usr/local/bin/init-workspace.sh

/usr/local/bin/emit-event.sh \
    "agent.started" \
    "Agent started" \
    "Codex agent started for job $JOB_ID stage $STAGE_ID" \
    "{\"model\": $(jq -Rn --arg value "$PRIMARY_MODEL" '$value')}"

TASK_FILE="$WORKSPACE_PATH/.agent-orch/current-task.md"
if [ -n "$TASK_PROMPT" ]; then
    RESOLVED_PROMPT="$TASK_PROMPT"
elif [ -f "$TASK_FILE" ]; then
    RESOLVED_PROMPT=$(cat "$TASK_FILE")
else
    RESOLVED_PROMPT="Review the workspace at $WORKSPACE_PATH and update TODO.md for workflow $WORKFLOW_ID stage $STAGE_ID."
fi

RESOLVED_PROMPT="$RESOLVED_PROMPT

---
Workspace: $WORKSPACE_PATH
Job: $JOB_ID | Workflow: $WORKFLOW_ID | Stage: $STAGE_ID
TODO.md path: $WORKSPACE_PATH/TODO.md"

cd "$WORKSPACE_PATH"

CODEX_EXIT=0
if [ -n "$PRIMARY_MODEL" ]; then
    codex exec \
        --json \
        --full-auto \
        --skip-git-repo-check \
        -C "$WORKSPACE_PATH" \
        -m "$PRIMARY_MODEL" \
        "$RESOLVED_PROMPT" 2>&1 | tee "$WORKSPACE_PATH/.agent-orch/logs/codex-$(date -u +%Y%m%dT%H%M%SZ).jsonl" \
        || CODEX_EXIT=$?
else
    codex exec \
        --json \
        --full-auto \
        --skip-git-repo-check \
        -C "$WORKSPACE_PATH" \
        "$RESOLVED_PROMPT" 2>&1 | tee "$WORKSPACE_PATH/.agent-orch/logs/codex-$(date -u +%Y%m%dT%H%M%SZ).jsonl" \
        || CODEX_EXIT=$?
fi

STATE_JSON="$WORKSPACE_PATH/.agent-orch/state.json"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FINAL_STATE="completed"
[ "$CODEX_EXIT" -ne 0 ] && FINAL_STATE="failed"

if command -v jq &>/dev/null && [ -f "$STATE_JSON" ]; then
    jq --arg state "$FINAL_STATE" \
       --arg updated_at "$NOW" \
       --argjson exit_code "$CODEX_EXIT" \
       '.state = $state | .updated_at_utc = $updated_at | .exit_code = $exit_code' \
       "$STATE_JSON" > "${STATE_JSON}.tmp" && mv "${STATE_JSON}.tmp" "$STATE_JSON"
fi

if [ "$CODEX_EXIT" -eq 0 ]; then
    /usr/local/bin/emit-event.sh "agent.completed" "Agent completed" \
        "Codex agent completed job $JOB_ID stage $STAGE_ID" \
        "{\"exit_code\": 0, \"provider\": \"$PROVIDER_ID\"}"
else
    /usr/local/bin/emit-event.sh "agent.failed" "Agent failed" \
        "Codex agent failed for job $JOB_ID stage $STAGE_ID (exit code $CODEX_EXIT)" \
        "{\"exit_code\": $CODEX_EXIT, \"provider\": \"$PROVIDER_ID\"}"
fi

exit "$CODEX_EXIT"
