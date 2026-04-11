# OpenAgents UI Quickstart

This guide walks you through running OpenAgents and launching your first agent job from the web UI.

## 1) Start the stack

```bash
bash scripts/build-images.sh
docker compose up -d --build
```

On Windows, use `pwsh scripts/first-run.ps1` instead to populate `.env`, build the provider images, and start the stack.

### Provider credentials

Set the auth environment variable for each provider you plan to run:

- `ANTHROPIC_API_KEY` - Claude Code
- `OPENAI_API_KEY` - Codex (and optionally OpenCode)
- `GEMINI_API_KEY` - Gemini (and optionally OpenCode)
- `GH_TOKEN` or `GITHUB_TOKEN` - Copilot (and optionally OpenCode)

Open:

- Web UI: `http://localhost:3001`
- API health: `http://localhost:8080/healthz`

## 2) Open Jobs and create a run

1. Go to **Jobs**.
2. Click **New Job**.
3. Fill:
   - **Title**: a short run name
   - **Prompt / Request**: what the agent should do
   - **Workflow**: usually `planning`
   - **Provider**: one of `claude-code`, `opencode`, `codex`, `gemini`, or `copilot`
   - **Workspace path**: local path for artifacts
4. Click **Create Job**.

![Jobs list](./screenshots/01-jobs-list.png)

## 3) Monitor execution

Open job detail and use tabs:

- **Stages & Tasks** for execution breakdown
- **Timeline** for events
- **Logs** for process output

![Job detail](./screenshots/02-job-detail-overview.png)
![Stages](./screenshots/03-job-detail-stages.png)
![Timeline](./screenshots/04-job-detail-timeline.png)
![Logs](./screenshots/05-job-detail-logs.png)

## 4) Configure workflows and providers

- **Workflows** page lets you create and enable/disable workflow definitions.
- **Settings** page lets you create and enable/disable provider definitions.

![Workflows](./screenshots/06-workflows.png)
![Settings](./screenshots/09-settings.png)

## 5) Inspect runtime and artifacts

- **Agents** shows runtime/provider summary.
- **Artifacts** browses workspace outputs for a selected job.

![Agents](./screenshots/07-agents.png)
![Artifacts](./screenshots/08-artifacts.png)

## 6) Validate end-to-end locally

```bash
pnpm format:check
dotnet test apps/orchestrator-api/OpenAgents.OrchestratorApi.csproj -v minimal
pnpm test:coverage:api
pnpm --filter orchestrator-web type-check
pnpm --filter orchestrator-web build
pnpm --filter orchestrator-web e2e
pnpm validate:compose
pnpm docs:build
```
