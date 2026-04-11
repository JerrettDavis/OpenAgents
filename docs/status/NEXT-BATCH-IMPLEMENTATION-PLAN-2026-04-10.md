# OpenAgents Next Batch Implementation Plan (2026-04-10)

## Goals for Next Execution Window

1. Establish clean baseline git history.
2. Convert stage/task pipeline from stubbed to real persisted runtime data.
3. Bring dashboard parity for core operational views (Jobs + Workflows + Artifacts).
4. Lock down contract confidence with integration/e2e coverage.

---

## Batch 0 — Clean Initial History (no push yet)

### Scope

- Stage files into logical slices and create a readable foundational commit series.

### Proposed commit slices

1. **chore(repo): bootstrap monorepo and toolchain**
   - root config, pnpm workspace, solution, formatting/linting, compose skeleton.
2. **feat(domain+api): add orchestrator domain, persistence, and job endpoints**
3. **feat(runtime): add job runner, workspace provisioner, docker/local runtimes, events+sse**
4. **feat(web): add jobs dashboard UI + typed API client + hooks**
5. **feat(provider+workflow): add claude-code provider and planning workflow assets**
6. **docs: add architecture/contract plans and current status docs**

### Acceptance criteria

- `git log --oneline` tells a coherent story in 5–8 commits.
- API tests and web build still green after each batch commit.

---

## Batch 1 — Stage/Task Runtime (close core stubs)

### Scope

- Implement first-class stage/task entities and persistence.
- Wire runtime progression and APIs.

### Work items

- Domain: add Stage/Task entities/value objects with lifecycle states.
- Persistence: add EF entities + mappings for stages/tasks.
- API: implement `/jobs/{id}/stages`, `/jobs/{id}/tasks`, stage detail.
- Runner: update `JobRunnerService` to emit stage/task transitions/events.
- Web: bind Stages & Tasks panel to real data and polling/live updates.

### Acceptance criteria

- Non-empty stage/task data for real jobs.
- Integration tests cover stage/task endpoint flows.
- No “v1 stub” comments remain in stage/task endpoint handlers.

---

## Batch 2 — Workflow & Provider Management Surface

### Scope

- Move from seed-only metadata to manageable configuration.

### Work items

- API: add CRUD endpoints for workflows/providers (admin-scoped for now).
- Validation: schema validation for workflow yaml and compatibility matrix.
- Web: replace Workflows placeholder with list/detail page using live API.
- Web: basic Providers/Settings surface for provider visibility.

### Acceptance criteria

- Can list and inspect multiple workflows/providers created post-seed.
- Workflows page no longer “coming soon”.

---

## Batch 3 — Artifacts + Observability Hardening

### Scope

- Operational usability improvements to inspect job outputs and system health.

### Work items

- API: artifact listing/read endpoints scoped by job/workspace.
- Web: artifacts browser in `/artifacts` and job detail deep links.
- Runtime: richer diagnostics for container failures and retries.
- System: either implement `/api/v1/stream/system` or remove unused client helper.

### Acceptance criteria

- Operators can inspect generated files from UI.
- Runtime failures include structured reason classification.

---

## Batch 4 — Test Net Expansion

### Scope

- Raise confidence for refactor velocity.

### Work items

- Add API contract tests for snake_case payload shapes.
- Add web e2e smoke (jobs list/create/detail/log stream).
- Add runtime integration tests for container failure/timeout paths.

### Acceptance criteria

- CI gate includes API tests + web e2e smoke.
- Regressions in key job loop fail fast.

---

## Immediate Start Recommendation

Start with **Batch 0 then Batch 1** before any wider feature expansion.

Reason: this gives us clean history first, then removes the highest-value functional gap (stage/task stubs) while preserving current momentum.
