# OpenAgents Status Overview (2026-04-10)

## Executive Summary

OpenAgents is in an **M0+/early M1** state:

- Core orchestrator API, domain model, and seeded workflow/provider definitions are implemented.
- Job lifecycle execution loop exists (queue → provision → run container → stream logs/events → complete/fail).
- Web dashboard has working Jobs list/detail flows and job actions.
- Stages/tasks execution model is now persisted and exposed through job stages/tasks APIs.
- Dashboard sections for Agents, Workflows, Artifacts, and Settings now render operational views.
- Repository now has an initial local commit; history should be reshaped into smaller logical commits before push.

## Local Validation Run

### Git / repo

- `git status`: working tree currently clean after local commit.
- Initial local commit exists: `097f747` (to be reshaped before push if needed).
- Added local remote only (no push):
  - `origin https://github.com/JerrettDavis/OpenAgents.git`

### Build/test health

- API tests: `55 passed, 0 failed` (`dotnet test` on `OpenAgents.OrchestratorApi.csproj`).
- API build: success (`dotnet build`).
- Web type-check: success (`pnpm --filter orchestrator-web type-check`).
- Web production build: success (`pnpm --filter orchestrator-web build`).
- Web E2E: success (`pnpm --filter orchestrator-web e2e`) with two passing workflow behavior specs and screenshot artifacts.
- API coverage collection is now enabled (`pnpm test:coverage:api`) and emits Cobertura XML under `apps/orchestrator-api/TestResults/*/coverage.cobertura.xml`.

## Current Product Surface

### Implemented and functioning

- API health/system endpoints (`/healthz`, `/api/v1/health`, `/api/v1/system/info`).
- Job endpoints (create/list/get/start/stop/archive/delete + logs/events + SSE stream).
- Background job runner with container runtime abstraction and local sim runtime option.
- Workspace provisioning and TODO parser utilities + tests.
- Seeded workflow (`planning`) and provider (`claude-code`).
- Web jobs UI: list, detail, creation dialog, live updates, actions.

### Explicitly incomplete

- Workflow engine semantics beyond single seeded flow.
- Provider management beyond one seeded provider.
- Git/workspace lifecycle management in domain layer remains milestone-noted.
- Formatting gate (`pnpm format:check`) still fails and must be resolved before push.

## Recommendation

Proceed with a clean initial commit series organized by vertical slices (foundation → API runtime → web jobs UX → docs/specs → provider/workflow assets) before any push.
