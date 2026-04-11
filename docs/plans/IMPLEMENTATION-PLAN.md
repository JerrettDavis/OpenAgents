# IMPLEMENTATION PLAN

## 1. Overview

This document translates the OpenAgents architecture, domain model, and specifications into a **practical, step-by-step build plan**.

The goal is to:

- Deliver value early
- Validate core assumptions quickly
- Avoid overbuilding
- Enable iterative expansion

We will build OpenAgents using a **vertical slice strategy**.

---

## 2. Guiding Strategy

### 2.1 Vertical Slice First

Build one fully working path end-to-end:

- Create job
- Run agent
- Show logs
- Produce report

Do NOT build all systems in parallel.

---

### 2.2 Contracts Before Complexity

- Lock schemas early
- Keep runtime simple initially
- Expand features after validation

---

### 2.3 Fake It Where Needed

- Stub metrics if unavailable
- Simplify parsing initially
- Prefer working system over perfect system

---

## 2.4 v1 Locked Decisions

The following decisions are locked for v1 and must not be relitigated in implementation:

| Decision              | v1 Value                                                     | Post-v1 Option            |
| --------------------- | ------------------------------------------------------------ | ------------------------- |
| Docs canonical source | `docs/plans/` (this directory)                               | —                         |
| Background reference  | `AGENTIC-CLI-ORCHESTRATION-PLAN.md` (archived)               | —                         |
| Workspace path        | `/workspace/<project>/`                                      | —                         |
| Persistence model     | CRUD + append-only event log                                 | Full event sourcing       |
| Event emission        | Filesystem via `.agent-orch/events/` watched by orchestrator | Message broker            |
| Mailbox notifications | Boundary-based polling (task/stage start)                    | Arbitrary stdin injection |
| First provider        | Claude Code                                                  | Additional providers      |
| MCP server            | **Deferred — out of scope for v1**                           | Post-v1                   |
| Devcontainer support  | **Deferred — out of scope for v1**                           | Post-v1                   |
| Auth posture          | Local/trusted environment — no auth layer                    | RBAC, API keys            |
| Realtime transport    | SSE (Server-Sent Events)                                     | WebSockets                |

---

## 3. Recommended Tech Stack

### Backend

- .NET (ASP.NET Core)
- Minimal APIs or modular architecture
- MediatR (optional for CQRS)

### Frontend

- React + Next.js
- Tailwind + shadcn/ui
- Zustand or TanStack Query

### Realtime

- **Server-Sent Events (SSE) — locked for v1**
- WebSockets — deferred to post-v1

### Storage

- PostgreSQL (or SQLite locally)
- File system for artifacts

### Container Control

- Docker SDK (dotnet Docker client or CLI wrapper)

---

## 4. Repo Bootstrapping

### Step 1: Create Repo Structure

```
/apps
  /orchestrator-api
  /orchestrator-web
/images
/packages
/workflows
/providers
/docs
```

---

### Step 2: Create Base Projects

- API project
- Web UI project
- Shared contracts project

---

### Step 3: Add Docker Compose

- orchestrator
- postgres (optional)

---

## 5. Milestone Plan

> **Milestone numbering note**: PRD.md uses phase-level groupings (M0–M6). This plan uses a finer-grained breakdown (M0–M10). See the mapping column below.
>
> **v1 scope = Milestones 0–6 of this plan** (Foundations → Event System + Timeline). Milestones 7–10 are post-v1.
>
> | This plan | PRD phase                 | Scope   |
> | --------- | ------------------------- | ------- |
> | M0        | M0 Foundations            | v1      |
> | M1        | M1 Single-Agent Execution | v1      |
> | M2        | M1 Single-Agent Execution | v1      |
> | M3        | M2 Workflow Engine        | v1      |
> | M4        | M1 Single-Agent Execution | v1      |
> | M5        | M4 Multi-Agent Teams      | v1      |
> | M6        | M1 Single-Agent Execution | v1      |
> | M7        | M4 Multi-Agent Teams      | post-v1 |
> | M8        | M3 Provider Expansion     | post-v1 |
> | M9        | M5 Metrics + Reporting    | post-v1 |
> | M10       | M6 Hardening              | post-v1 |

---

## MILESTONE 0: Foundations

### Goals

- Bootstrapped repo
- Basic API + UI
- Docker running

### Tasks

- Create API skeleton
- Create UI shell
- Add health endpoint
- Setup docker-compose

### Output

- Running app with blank dashboard

---

## MILESTONE 1: Single Agent Execution (CRITICAL)

### Goals

- Run one container
- Execute simple workflow
- Capture logs

### Tasks

#### Backend

- Create Job entity (in-memory or DB)
- Implement Job creation endpoint
- Implement Docker container launch
- Attach to logs

#### Agent Image

- Create base-agent image
- Run simple script (echo loop)

#### UI

- Create Jobs list
- Create Job detail page
- Stream logs

### Output

- Create job → see logs in UI

---

## MILESTONE 2: Workspace + TODO

### Goals

- Introduce workspace contract
- Persist files

### Tasks

- Mount workspace volume
- Create TODO.md
- Parse TODO.md (basic)
- Display tasks in UI

### Output

- Agent updates TODO.md → UI reflects changes

---

## MILESTONE 3: Workflow Engine (Basic)

### Goals

- Load workflow YAML
- Expand stages and tasks

### Tasks

- Implement workflow parser
- Create Stage + Task instances
- Persist state
- Render stages/tasks in UI

### Output

- Jobs show structured stages/tasks

---

## MILESTONE 4: Provider Integration — Claude Code (First Provider)

### Goals

- Replace dummy agent with Claude Code CLI

### Tasks

- Add Claude Code provider adapter
- Implement provider launch contract
- Basic log parsing

> **v1 decision: Claude Code is the first and only provider for v1. Additional providers are post-v1.**

### Output

- Real Claude Code agent executing real work

---

## MILESTONE 5: Mailbox System

### Goals

- Enable agent communication

### Tasks

- Implement mailbox directory structure
- Implement orchestrator outbox watcher and delivery
- Add boundary-based polling notifications (task/stage start boundaries)
- Add mailbox UI panel

> **v1 decision: Notifications are boundary-based and polled. Arbitrary stdin injection into a running process is post-v1.**

### Output

- Agents can send and receive messages via mailbox

---

## MILESTONE 6: Event System + Timeline

### Goals

- Introduce structured events

### Tasks

- Implement event envelope schema
- Agent containers write events as JSON files to `.agent-orch/events/`
- Orchestrator watches `.agent-orch/events/` directory and ingests new files
- Store ingested events to DB event log (CRUD append)
- Broadcast ingested events to UI via SSE
- Build timeline UI

> **v1 decision: Event emission is filesystem-based. Orchestrator polls/watches `.agent-orch/events/`. CRUD + event-log storage — no full event sourcing in v1.**

### Output

- Live event stream visible in UI timeline

---

## MILESTONE 7: Multi-Agent Teams

### Goals

- Support multiple containers per job

### Tasks

- Implement crew model
- Launch multiple agents
- Coordinate via mailbox

### Output

- Multi-agent workflow works

---

## MILESTONE 8: Git Integration

### Goals

- Track repository changes

### Tasks

- Detect commits
- Display git status
- Show diff summary

### Output

- Git activity visible in UI

---

## MILESTONE 9: Metrics + Reporting

### Goals

- Show token/model usage
- Generate reports

### Tasks

- Capture token metrics (if available)
- Generate report markdown
- Display report in UI

### Output

- Jobs produce reports and metrics

---

## MILESTONE 10: Dashboard Polish

### Goals

- Improve UX to "pro tool" level

### Tasks

- Dockable panels
- Command palette
- Keyboard shortcuts
- Theme system

### Output

- Feels like a real dev tool

---

## 6. First Vertical Slice (Exact Target)

Build this first:

1. Create Job
2. Launch container
3. Run script
4. Stream logs
5. Save output
6. Show in UI

Everything else builds on this.

---

## 7. Key Risks

### Overengineering early

Mitigation:

- Build minimal slice first

### Provider complexity

Mitigation:

- Start with one provider

### Log parsing difficulty

Mitigation:

- Start raw, improve later

---

## 8. Testing Strategy

### Unit Tests

- Domain logic
- Workflow parsing

### Integration Tests

- Container execution
- Workspace behavior

### E2E Tests

- Job creation → completion

---

## 9. Dev Workflow

- Local docker-compose
- Hot reload UI
- Fast API iteration

---

## 10. Definition of Done (v1)

System is usable when:

- Can run real agent job
- Can observe progress live
- Can view tasks and stages
- Can see logs and artifacts
- Can generate report

---

## 11. Summary

This plan ensures:

- Fast feedback
- Incremental progress
- Low risk

The most important thing:

**Ship the first working agent loop as fast as possible.**

Everything else builds on that.
