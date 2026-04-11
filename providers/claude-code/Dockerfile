# ──────────────────────────────────────────────────────────────────────────────
# providers/claude-code/Dockerfile
#
# Claude Code provider image for OpenAgents v1.
# Extends the base-agent image with Node.js and the Claude Code CLI.
#
# IMPORTANT: ANTHROPIC_API_KEY is NOT baked into this image.
# It must be supplied at container runtime via the -e flag or
# the OpenAgents orchestrator's environment injection.
#
# Build:
#   # Build base image first:
#   docker build -t openagents/base-agent:latest images/base-agent
#   # Then provider image:
#   docker build -t openagents/provider-claude-code:latest providers/claude-code
#
# Run (smoke test):
#   docker run --rm \
#     -e ANTHROPIC_API_KEY=sk-ant-... \
#     -e JOB_ID=test-001 \
#     -e WORKFLOW_ID=planning \
#     -e STAGE_ID=plan \
#     -e TASK_ID=task-001 \
#     -e WORKSPACE_PATH=/workspace/test-001 \
#     -e TASK_PROMPT="Write a one-sentence hello world plan." \
#     -v /tmp/oa-test:/workspace/test-001 \
#     openagents/provider-claude-code:latest
# ──────────────────────────────────────────────────────────────────────────────

FROM openagents/base-agent:latest

# Switch to root to install packages
USER root

# ── Node.js 22 LTS ────────────────────────────────────────────────────────────
# Uses NodeSource binary distribution for a predictable, pinned version.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Claude Code CLI ───────────────────────────────────────────────────────────
# @anthropic-ai/claude-code installs the `claude` binary globally.
#
# PINNING POLICY — prefer an exact patch version so every image rebuild
# produces an identical binary regardless of what npm publishes later.
#
# To advance to a newer release:
#   1. Find the target version:
#        docker run --rm node:22-alpine \
#          npm view @anthropic-ai/claude-code version
#      or check https://www.npmjs.com/package/@anthropic-ai/claude-code
#   2. Pass it at build time:
#        docker build --build-arg CLAUDE_CODE_VERSION=1.x.y ...
#   3. Rebuild and run the smoke-test in the header comment.
#
# The ARG defaults to the v1 major range so the image continues to build
# out of the box; override it in CI to lock to a specific patch release.
ARG CLAUDE_CODE_VERSION=1
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
    && claude --version

# ── Provider entrypoint scripts ───────────────────────────────────────────────
COPY scripts/ /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# ── Switch back to agent user ──────────────────────────────────────────────────
USER agent
WORKDIR /workspace

# ── Health check (inherited from base; add claude ping) ───────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD ["/usr/local/bin/healthcheck.sh"]

# Runtime env (values without defaults MUST be supplied by the orchestrator)
# ANTHROPIC_API_KEY  – required; no default; injected at runtime only
ENV PROVIDER_ID=claude-code \
    PROVIDER_VERSION=1.0.0 \
    PRIMARY_MODEL=claude-opus-4-5 \
    WORKSPACE_PATH=/workspace/project \
    MAILBOX_PATH=/workspace/project/.mailbox \
    ITERATIONS=10 \
    ITERATIONS__STAGE=5 \
    ITERATIONS__TASK=3

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
