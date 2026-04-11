#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# scripts/build-images.sh
#
# Builds the OpenAgents agent Docker images in the correct dependency order:
#   1. openagents/base-agent:latest       (images/base-agent/)
#   2. openagents/provider-claude-code:latest  (providers/claude-code/)
#
# Usage:
#   bash scripts/build-images.sh [--no-cache] [--push <registry>]
#
# Options:
#   --no-cache     Pass --no-cache to docker build
#   --push <reg>   Tag and push to a registry (e.g. myregistry.io/openagents)
#
# Prerequisites:
#   - Docker running and accessible
#   - Run from the repository root
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NO_CACHE=""
PUSH_REGISTRY=""

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-cache)   NO_CACHE="--no-cache"; shift ;;
        --push)       PUSH_REGISTRY="$2"; shift 2 ;;
        *)            echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
build_image() {
    local tag="$1"
    local context="$2"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Building: $tag"
    echo "  Context:  $context"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    # shellcheck disable=SC2086
    docker build $NO_CACHE -t "$tag" "$context"
    echo "  ✓ Built $tag"
}

push_image() {
    local local_tag="$1"
    local registry="$2"
    local remote_tag="$registry/$(echo "$local_tag" | sed 's|openagents/||')"
    echo "  Pushing $local_tag → $remote_tag"
    docker tag "$local_tag" "$remote_tag"
    docker push "$remote_tag"
}

# ── Build ─────────────────────────────────────────────────────────────────────
echo "OpenAgents Image Builder"
echo "Repository root: $REPO_ROOT"

build_image "openagents/base-agent:latest" "$REPO_ROOT/images/base-agent"
build_image "openagents/provider-claude-code:latest" "$REPO_ROOT/providers/claude-code"

# ── Optional push ─────────────────────────────────────────────────────────────
if [ -n "$PUSH_REGISTRY" ]; then
    echo ""
    echo "Pushing images to $PUSH_REGISTRY..."
    push_image "openagents/base-agent:latest"              "$PUSH_REGISTRY"
    push_image "openagents/provider-claude-code:latest"    "$PUSH_REGISTRY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  All images built successfully."
echo ""
echo "  openagents/base-agent:latest"
echo "  openagents/provider-claude-code:latest"
echo ""
echo "  Next: docker compose up -d"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
