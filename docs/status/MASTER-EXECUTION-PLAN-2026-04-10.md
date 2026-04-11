# OpenAgents Master Execution Plan (Directed) — 2026-04-10

## Objective

Close all current stubs/TODO-level placeholders with validated implementation plans and explicit ownership, then prepare clean commit history. No push until closure gates pass.

## Workstream Assignment

## WS-A — Backend + Domain (Owner: Backend/Domain)

### Scope

- Implement first-class Stage/Task runtime model.
- Replace stage/task stub endpoint behavior in API.
- Align workflow/provider endpoint contracts with future management needs.

### Files in scope

- `packages/domain/Aggregates/Jobs/Job.cs`
- `packages/domain/Aggregates/Workflows/WorkflowDefinition.cs`
- `packages/domain/Aggregates/Workspaces/Workspace.cs`
- `apps/orchestrator-api/JobEndpoints.cs`
- `apps/orchestrator-api/OrchestratorDbContext.cs`
- `apps/orchestrator-api/*Tests.cs`

### Tasks

1. Add domain entities/value objects for stage and task lifecycle.
2. Add persistence model + EF mappings for stages/tasks.
3. Implement `/jobs/{id}/stages` and `/jobs/{id}/tasks` with real payloads.
4. Add integration tests for non-empty responses on active jobs.

### Validation gates

- `dotnet test apps/orchestrator-api/OpenAgents.OrchestratorApi.csproj`
- Stage/task endpoints return real data in integration tests.
- No remaining `v1 stub` comments for stages/tasks.

---

## WS-B — Runtime + Provider Loop (Owner: Runtime)

### Scope

- Upgrade runner to emit stage/task transitions.
- Harden container failure handling and diagnostics.
- Ensure TODO/workspace artifacts remain contract-compliant.

### Files in scope

- `apps/orchestrator-api/JobRunnerService.cs`
- `apps/orchestrator-api/DockerCliRuntime.cs`
- `apps/orchestrator-api/WorkspaceProvisioner.cs`
- `providers/claude-code/scripts/entrypoint.sh`

### Tasks

1. Wire runner lifecycle to stage/task state changes.
2. Emit structured error envelopes for runtime failures.
3. Add retry/backoff policy boundaries for container start/wait.
4. Add runtime-focused tests for fail/timeout/error transitions.

### Validation gates

- API tests green with new runtime behaviors.
- Manual smoke run produces expected event timeline (start→stage/task→complete/fail).
- Redacted secrets confirmed in logs.

---

## WS-C — Web Dashboard Completeness (Owner: Frontend)

### Scope

- Replace placeholder pages (Workflows/Agents/Artifacts/Settings) with operational views.
- Keep Jobs surface stable and contract-aligned.

### Files in scope

- `apps/orchestrator-web/app/(dashboard)/workflows/page.tsx`
- `apps/orchestrator-web/app/(dashboard)/agents/page.tsx`
- `apps/orchestrator-web/app/(dashboard)/artifacts/page.tsx`
- `apps/orchestrator-web/app/(dashboard)/settings/page.tsx`
- `apps/orchestrator-web/lib/api/client.ts`
- `apps/orchestrator-web/lib/hooks/*`

### Tasks

1. Build workflows list/detail page using live API.
2. Build artifacts browser tied to job/workspace outputs.
3. Build minimal provider/settings management UI.
4. Add UX states: loading/empty/error/retry for each new surface.

### Validation gates

- `pnpm --filter orchestrator-web type-check`
- `pnpm --filter orchestrator-web build`
- Manual UX smoke for each route and key interactions.

---

## WS-D — QA + Docs + Release Hygiene (Owner: QA/Docs)

### Scope

- Keep implementation/status docs synchronized with actual code.
- Establish go/no-go gate before first push.

### Tasks

1. Maintain status matrix per workstream completion.
2. Add contract/e2e checklist for API↔web compatibility.
3. Maintain clean commit stack with logical boundaries.

### Validation gates

- Docs updated in same commit batch as related code.
- Commit messages map 1:1 to workstream slices.
- Final checklist fully passed before push.

---

## Stub/TODO Closure Checklist

- [ ] `JobEndpoints` stages stub removed.
- [ ] `JobEndpoints` tasks stub removed.
- [ ] Domain comments marking core lifecycle as stub replaced by implemented behavior docs.
- [ ] Dashboard "coming soon" placeholders removed or explicitly marked out-of-scope with issue links.
- [ ] Remaining TODOs triaged into either implemented work or tracked backlog items.

## Pre-Push Go/No-Go

All must be true:

- [ ] `dotnet test` green
- [ ] `dotnet build` green
- [ ] `pnpm type-check` green
- [ ] `pnpm build` green
- [ ] Status docs updated (`docs/status/*`)
- [ ] Commit stack clean and reviewable
- [ ] No unowned stubs/TODOs in in-scope features

If any item is false → **NO-GO** (no push).
