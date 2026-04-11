FROM openagents/base-agent:latest

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

ARG CODEX_VERSION=0.120.0
RUN npm install -g @openai/codex@${CODEX_VERSION} \
    && codex --version

COPY scripts/ /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

USER agent
WORKDIR /workspace

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD ["/usr/local/bin/healthcheck.sh"]

ENV PROVIDER_ID=codex \
    PROVIDER_VERSION=0.120.0 \
    WORKSPACE_PATH=/workspace/project \
    MAILBOX_PATH=/workspace/project/.mailbox \
    ITERATIONS=10 \
    ITERATIONS__STAGE=5 \
    ITERATIONS__TASK=3

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
