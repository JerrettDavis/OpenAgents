# Developer Overview

## Solution layout

- `apps/orchestrator-api` — ASP.NET Core API and runtime orchestration
- `apps/orchestrator-web` — Next.js dashboard
- `packages/domain` — domain aggregates, contracts, enums
- `providers` — provider assets and container scripts
- `workflows` — workflow definitions

## Local loop

```bash
pnpm install
dotnet test apps/orchestrator-api/OpenAgents.OrchestratorApi.csproj -v minimal
pnpm --filter orchestrator-web type-check
pnpm --filter orchestrator-web build
pnpm --filter orchestrator-web e2e
```

## Quality gates

```bash
pnpm format:check
pnpm test:coverage:api
pnpm validate:compose
```
