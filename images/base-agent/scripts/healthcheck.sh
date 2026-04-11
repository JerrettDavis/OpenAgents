#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# healthcheck.sh
#
# Container health check for the base-agent image.
# Returns 0 (healthy) if the workspace directory is accessible.
# Returns 1 (unhealthy) otherwise.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

WORKSPACE_PATH="${WORKSPACE_PATH:-/workspace}"

if [ ! -d "$WORKSPACE_PATH" ]; then
    echo "[healthcheck] FAIL: workspace not found at $WORKSPACE_PATH"
    exit 1
fi

echo "[healthcheck] OK: workspace accessible at $WORKSPACE_PATH"
exit 0
