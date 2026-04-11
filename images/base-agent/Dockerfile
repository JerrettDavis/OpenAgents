# ──────────────────────────────────────────────────────────────────────────────
# images/base-agent/Dockerfile
#
# Minimal base image that every agent container derives from.
# Providers (claude-code, etc.) add their CLI toolchain on top:
#   FROM openagents/base-agent:latest
#
# This image:
#   • Installs git, curl, jq, ca-certificates, and a POSIX bash shell
#   • Creates the /workspace directory tree
#   • Installs helper scripts (init-workspace, emit-event, healthcheck)
#   • Runs as non-root user `agent` (uid 1000)
#
# Build:
#   docker build -t openagents/base-agent:latest images/base-agent
# ──────────────────────────────────────────────────────────────────────────────

FROM debian:bookworm-slim

# ── System packages ────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    jq \
    inotify-tools \
    procps \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user ──────────────────────────────────────────────────────────────
RUN groupadd --gid 1000 agent \
 && useradd --uid 1000 --gid 1000 --shell /bin/bash --create-home agent

# ── Directory structure ────────────────────────────────────────────────────────
# /workspace is the bind-mount target for all project workspaces.
# The actual project lives at /workspace/<project-slug>/ at runtime;
# init-workspace.sh creates the subdirectory and .agent-orch scaffolding.
RUN mkdir -p /workspace /workspaces \
 && chown -R agent:agent /workspace /workspaces

# ── Helper scripts ─────────────────────────────────────────────────────────────
COPY scripts/ /usr/local/bin/
RUN chmod +x /usr/local/bin/init-workspace.sh \
             /usr/local/bin/emit-event.sh \
             /usr/local/bin/healthcheck.sh

# ── Git global config (safe inside containers) ────────────────────────────────
RUN git config --system core.autocrlf input \
 && git config --system init.defaultBranch main
# NOTE: safe.directory is NOT set to '*' here.
# init-workspace.sh sets `git config --global safe.directory "$WORKSPACE_PATH"`
# at runtime so the trust grant is scoped to the exact workspace path for that
# container, rather than trusting every directory on the filesystem.

USER agent
WORKDIR /workspace

# ── Health check ───────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["/usr/local/bin/healthcheck.sh"]

# Providers override ENTRYPOINT; base image drops to bash for debugging.
CMD ["bash"]
