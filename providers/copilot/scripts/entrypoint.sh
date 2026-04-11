#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_PATH="${WORKSPACE_PATH:-/workspace/project}"
MAILBOX_PATH="${MAILBOX_PATH:-$WORKSPACE_PATH/.mailbox}"
JOB_ID="${JOB_ID:-}"
WORKFLOW_ID="${WORKFLOW_ID:-}"
WORKFLOW_VERSION="${WORKFLOW_VERSION:-0.1.0}"
STAGE_ID="${STAGE_ID:-}"
TASK_ID="${TASK_ID:-}"
PROVIDER_ID="${PROVIDER_ID:-copilot}"
AGENT_ID="${AGENT_ID:-agent-${JOB_ID:-unknown}}"
TASK_PROMPT="${TASK_PROMPT:-}"
PRIMARY_MODEL="${PRIMARY_MODEL:-}"

export JOB_ID WORKFLOW_ID STAGE_ID TASK_ID AGENT_ID PROVIDER_ID WORKSPACE_PATH

ERRORS=0
if [ -z "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]; then
    echo "[entrypoint] ERROR: GH_TOKEN or GITHUB_TOKEN is required." >&2
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
    "Copilot agent started for job $JOB_ID stage $STAGE_ID" \
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

COPILOT_EXIT=0
if [ -n "$PRIMARY_MODEL" ]; then
    copilot \
        -p "$RESOLVED_PROMPT" \
        --allow-all \
        --output-format json \
        --no-ask-user \
        --no-color \
        --model "$PRIMARY_MODEL" 2>&1 | tee "$WORKSPACE_PATH/.agent-orch/logs/copilot-$(date -u +%Y%m%dT%H%M%SZ).jsonl" \
        || COPILOT_EXIT=$?
else
    copilot \
        -p "$RESOLVED_PROMPT" \
        --allow-all \
        --output-format json \
        --no-ask-user \
        --no-color 2>&1 | tee "$WORKSPACE_PATH/.agent-orch/logs/copilot-$(date -u +%Y%m%dT%H%M%SZ).jsonl" \
        || COPILOT_EXIT=$?
fi

STATE_JSON="$WORKSPACE_PATH/.agent-orch/state.json"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FINAL_STATE="completed"
[ "$COPILOT_EXIT" -ne 0 ] && FINAL_STATE="failed"

if command -v jq &>/dev/null && [ -f "$STATE_JSON" ]; then
    jq --arg state "$FINAL_STATE" \
       --arg updated_at "$NOW" \
       --argjson exit_code "$COPILOT_EXIT" \
       '.state = $state | .updated_at_utc = $updated_at | .exit_code = $exit_code' \
       "$STATE_JSON" > "${STATE_JSON}.tmp" && mv "${STATE_JSON}.tmp" "$STATE_JSON"
fi

if [ "$COPILOT_EXIT" -eq 0 ]; then
    /usr/local/bin/emit-event.sh "agent.completed" "Agent completed" \
        "Copilot agent completed job $JOB_ID stage $STAGE_ID" \
        "{\"exit_code\": 0, \"provider\": \"$PROVIDER_ID\"}"
else
    /usr/local/bin/emit-event.sh "agent.failed" "Agent failed" \
        "Copilot agent failed for job $JOB_ID stage $STAGE_ID (exit code $COPILOT_EXIT)" \
        "{\"exit_code\": $COPILOT_EXIT, \"provider\": \"$PROVIDER_ID\"}"
fi

exit "$COPILOT_EXIT"
