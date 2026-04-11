#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# scripts/smoke-test-agent.sh
#
# Runs the Claude Code provider container directly against a temporary
# workspace to verify the image, ANTHROPIC_API_KEY, and event emission
# work correctly end-to-end — without the full orchestrator stack.
#
# Prerequisites:
#   - openagents/provider-claude-code:latest image built
#     (run: bash scripts/build-images.sh)
#   - ANTHROPIC_API_KEY set in environment
#
# Usage:
#   ANTHROPIC_API_KEY=sk-ant-... bash scripts/smoke-test-agent.sh
#   # or with .env:
#   export $(cat .env | grep -v '#' | xargs) && bash scripts/smoke-test-agent.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

: "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY must be set}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE_BASE="${TMPDIR:-/tmp}/oa-smoke-test"
JOB_ID="smoke-$(date +%s)"
PROJECT_SLUG="smoke-project"
WORKSPACE_PATH="$WORKSPACE_BASE/$PROJECT_SLUG"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OpenAgents Smoke Test"
echo "  Job ID:    $JOB_ID"
echo "  Workspace: $WORKSPACE_PATH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create workspace directory on host
mkdir -p "$WORKSPACE_PATH"

echo "[smoke-test] Running agent container..."
echo ""

docker run --rm \
    --name "oa-smoke-$JOB_ID" \
    -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
    -e JOB_ID="$JOB_ID" \
    -e WORKFLOW_ID="planning" \
    -e WORKFLOW_VERSION="0.1.0" \
    -e STAGE_ID="plan" \
    -e TASK_ID="task-001" \
    -e WORKSPACE_PATH="/workspace/$PROJECT_SLUG" \
    -e MAILBOX_PATH="/workspace/$PROJECT_SLUG/.mailbox" \
    -e PRIMARY_MODEL="claude-haiku-4-5" \
    -e ITERATIONS__TASK="2" \
    -e TASK_PROMPT="Write a one-paragraph plan for a hello-world web application. Update TODO.md and write a brief report to .agent-orch/reports/." \
    -v "$WORKSPACE_PATH:/workspace/$PROJECT_SLUG" \
    openagents/provider-claude-code:latest

EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$EXIT_CODE" -eq 0 ]; then
    echo "  ✓ Smoke test PASSED (exit code 0)"
else
    echo "  ✗ Smoke test FAILED (exit code $EXIT_CODE)"
fi
echo ""
echo "  Workspace output at: $WORKSPACE_PATH"
echo ""

# Show the emitted events
EVENTS_DIR="$WORKSPACE_PATH/.agent-orch/events"
if [ -d "$EVENTS_DIR" ] && [ "$(ls -A "$EVENTS_DIR" 2>/dev/null)" ]; then
    echo "  Emitted events:"
    for f in "$EVENTS_DIR"/*.json; do
        EVENT_TYPE=$(jq -r '.event_type // "unknown"' "$f" 2>/dev/null || echo "unknown")
        echo "    - $EVENT_TYPE  ($f)"
    done
else
    echo "  No events emitted (check agent logs)"
fi

# Show TODO.md if it exists
TODO_MD="$WORKSPACE_PATH/TODO.md"
if [ -f "$TODO_MD" ]; then
    echo ""
    echo "  TODO.md contents:"
    echo "  ─────────────────"
    cat "$TODO_MD" | sed 's/^/  /'
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit "$EXIT_CODE"
