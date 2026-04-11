# Images

This directory contains Docker image definitions for the OpenAgents agent runtime.

## Structure

```
images/
  base-agent/       # Minimal base image all agent containers derive from
```

## base-agent

The base agent image provides:

- A shell environment for running CLI agents
- Standard workspace directory structure (`/workspace/<project>`)
- Mailbox and `.agent-orch` directory scaffolding
- Health-check script

**Implemented in: Milestone 1**

Providers (Claude Code, Codex, etc.) each supply their own image that `FROM base-agent`.
Provider images live under `providers/<name>/`.

Current provider images:

- `openagents/provider-claude-code:latest`
- `openagents/provider-opencode:latest`
- `openagents/provider-codex:latest`
- `openagents/provider-gemini:latest`
- `openagents/provider-copilot:latest`
