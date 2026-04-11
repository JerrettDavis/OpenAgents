# OpenAgents

OpenAgents is a docker-first orchestration platform for running agent workflows from a simple web UI.

## What you can do today

- Configure workflows and providers from the UI
- Run headless jobs across Claude Code, OpenCode, Codex, Gemini, and Copilot
- Create jobs with prompt/request input
- Start and stop runs
- Monitor live execution (stages/tasks, timeline, logs)
- Browse generated artifacts
- Run end-to-end tests with screenshot capture

## Stack

- **API:** ASP.NET Core (.NET 10)
- **Web:** Next.js 16 + TypeScript
- **Data:** SQLite (docker-compose)
- **Runtime:** Dockerized agents + local sim runtime

## Quick start

```bash
pnpm install
bash scripts/build-images.sh
docker compose up -d --build
```

On Windows, use `pwsh scripts/first-run.ps1` to populate `.env`, build all provider images, and start the stack.

Open:

- UI: `http://localhost:3001`
- API health: `http://localhost:8080/healthz`

## Supported headless providers

| Provider ID   | CLI                | Auth env                                                                               |
| ------------- | ------------------ | -------------------------------------------------------------------------------------- |
| `claude-code` | Claude Code        | `ANTHROPIC_API_KEY`                                                                    |
| `opencode`    | OpenCode           | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GH_TOKEN`, or `GITHUB_TOKEN` |
| `codex`       | OpenAI Codex CLI   | `OPENAI_API_KEY`                                                                       |
| `gemini`      | Google Gemini CLI  | `GEMINI_API_KEY`                                                                       |
| `copilot`     | GitHub Copilot CLI | `GH_TOKEN` or `GITHUB_TOKEN`                                                           |

## Validate everything

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

## Repository layout

- `apps/orchestrator-api` — API + job runner + runtime integration
- `apps/orchestrator-web` — dashboard UI
- `packages/domain` — aggregates/contracts
- `providers` — provider assets
- `workflows` — workflow definitions
- `docs` — user guides + developer docs + status docs

## Documentation

- User guide: `docs/guides/quickstart-ui.md`
- Ops runbook: `docs/guides/operations-runbook.md`
- DocFX-style docs entry: `docs/index.md` (`docs/docfx.json`, `docs/toc.yml`)

## CI / Repo hygiene

- CI workflow: `.github/workflows/ci.yml`
- Compose validation workflow: `.github/workflows/compose-validate.yml`
- Issue/PR templates and CODEOWNERS under `.github/`

## Notes on initial history

Local implementation work is currently in multiple commits. Before publishing, squash/rewrite to a single clean commit on `main` with message:

`feat: initial commit`
