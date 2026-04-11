# Development Setup

## Prerequisites

- .NET SDK 10.x
- Node.js 22+
- pnpm 10+
- Docker + Docker Compose

## Bootstrap

```bash
pnpm install
```

## Run locally (without docker)

### API

```bash
dotnet run --project apps/orchestrator-api/OpenAgents.OrchestratorApi.csproj --urls http://127.0.0.1:5080
```

### Web

```bash
cd apps/orchestrator-web
NEXT_PUBLIC_API_URL=http://127.0.0.1:5080 pnpm dev
```

## Run docker stack

```bash
docker compose up -d --build
```

Endpoints:

- Web: `http://localhost:3001`
- API: `http://localhost:8080`
- Health: `http://localhost:8080/healthz`

## Quality gates

```bash
pnpm format:check
dotnet test apps/orchestrator-api/OpenAgents.OrchestratorApi.csproj -v minimal
pnpm test:coverage:api
pnpm --filter orchestrator-web type-check
pnpm --filter orchestrator-web build
pnpm --filter orchestrator-web e2e
pnpm validate:compose
```

## Docs

DocFX-style docs live under `docs/`:

```bash
pnpm docs:build
# optional local serve
pnpm docs:serve
```

## Useful scripts

- `pnpm docker:up`
- `pnpm docker:down`
- `pnpm docker:logs`
- `pnpm validate:compose`
